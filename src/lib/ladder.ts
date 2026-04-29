import { db } from "./db";
import { updateElo, winnerFromSets } from "./elo";
import { notify } from "./notifications";

// Pyramide: Forderung erlaubt wenn Challenger max. 2 Reihen unter Challenged
// Reihen-Logik: Position 1 ist oben, 2-3 zweite Reihe, 4-6 dritte Reihe, ...
export function pyramidRow(position: number): number {
  // 1->1, 2-3->2, 4-6->3, 7-10->4, 11-15->5
  let row = 1;
  let max = 1;
  while (position > max) {
    row++;
    max += row;
  }
  return row;
}

export async function canChallenge(input: {
  ladderId: string;
  challengerId: string;
  challengedId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ladder = await db.ladder.findUnique({
    where: { id: input.ladderId },
    include: {
      participants: {
        where: { OR: [{ memberId: input.challengerId }, { memberId: input.challengedId }] },
      },
    },
  });
  if (!ladder) return { ok: false, reason: "LADDER_NOT_FOUND" };
  if (!ladder.active) return { ok: false, reason: "INACTIVE" };
  const cher = ladder.participants.find((p) => p.memberId === input.challengerId);
  const ched = ladder.participants.find((p) => p.memberId === input.challengedId);
  if (!cher || !ched) return { ok: false, reason: "NOT_PARTICIPANT" };

  if (ladder.format === "pyramid") {
    const rowDiff = pyramidRow(cher.position) - pyramidRow(ched.position);
    if (rowDiff < 1 || rowDiff > 2) {
      return { ok: false, reason: "INVALID_PYRAMID_ROW", };
    }
  }

  // Cooldown: hat dieser Challenger juengst gespielt?
  const since = new Date(Date.now() - ladder.cooldownDays * 24 * 3600 * 1000);
  const recent = await db.challenge.count({
    where: {
      ladderId: ladder.id,
      OR: [{ challengerId: input.challengerId }, { challengedId: input.challengerId }],
      validatedAt: { gte: since },
    },
  });
  if (recent > 0) return { ok: false, reason: "COOLDOWN" };

  // Open challenge zwischen den beiden?
  const open = await db.challenge.count({
    where: {
      ladderId: ladder.id,
      status: { in: ["pending", "accepted"] },
      OR: [
        { challengerId: input.challengerId, challengedId: input.challengedId },
        { challengerId: input.challengedId, challengedId: input.challengerId },
      ],
    },
  });
  if (open > 0) return { ok: false, reason: "ALREADY_OPEN" };

  return { ok: true };
}

export async function createChallenge(input: {
  ladderId: string;
  challengerId: string;
  challengedId: string;
}) {
  const ladder = await db.ladder.findUnique({ where: { id: input.ladderId } });
  if (!ladder) throw new Error("LADDER_NOT_FOUND");
  const deadline = new Date(Date.now() + ladder.acceptDays * 24 * 3600 * 1000);

  const c = await db.challenge.create({
    data: {
      ladderId: input.ladderId,
      challengerId: input.challengerId,
      challengedId: input.challengedId,
      deadline,
    },
    include: { challenged: true, ladder: true },
  });

  await notify({
    tenantId: c.ladder.tenantId,
    memberId: c.challengedId,
    channel: "email",
    template: "ladder_challenge_received",
    subject: `Forderung in ${c.ladder.name}`,
    body: `Du wurdest gefordert. Annahmefrist bis ${deadline.toLocaleDateString("de-AT")}.`,
    meta: { challengeId: c.id },
  });

  return c;
}

// Ergebnis eintragen + Elo + Pyramide updaten
export async function reportResult(input: {
  challengeId: string;
  sets: number[][];
}) {
  const c = await db.challenge.findUnique({
    where: { id: input.challengeId },
    include: { ladder: true, challenger: true, challenged: true },
  });
  if (!c) throw new Error("CHALLENGE_NOT_FOUND");
  if (c.status === "played") throw new Error("ALREADY_PLAYED");

  const winner = winnerFromSets(input.sets);
  const winnerId = winner === "a" ? c.challengerId : c.challengedId;

  // Elo-Update
  const cherSkill = c.challenger.skillScore;
  const chedSkill = c.challenged.skillScore;
  const eloResult: 1 | 0 = winner === "a" ? 1 : 0;
  const elo = updateElo(cherSkill, chedSkill, eloResult);
  await db.member.update({ where: { id: c.challengerId }, data: { skillScore: elo.a } });
  await db.member.update({ where: { id: c.challengedId }, data: { skillScore: elo.b } });

  // Pyramide tauschen wenn Challenger gewinnt
  if (c.ladder.format === "pyramid" && winner === "a") {
    const cherPart = await db.ladderParticipant.findUnique({
      where: { ladderId_memberId: { ladderId: c.ladderId, memberId: c.challengerId } },
    });
    const chedPart = await db.ladderParticipant.findUnique({
      where: { ladderId_memberId: { ladderId: c.ladderId, memberId: c.challengedId } },
    });
    if (cherPart && chedPart) {
      await db.$transaction([
        db.ladderParticipant.update({
          where: { id: cherPart.id },
          data: { position: chedPart.position },
        }),
        db.ladderParticipant.update({
          where: { id: chedPart.id },
          data: { position: cherPart.position },
        }),
      ]);
    }
  }

  // Punkte (für points-Format)
  if (c.ladder.format === "points") {
    const winnerSkill = winner === "a" ? cherSkill : chedSkill;
    const loserSkill = winner === "a" ? chedSkill : cherSkill;
    // Sieg gegen Stärkeren = mehr Punkte
    const points = winnerSkill < loserSkill ? 3 : winnerSkill === loserSkill ? 2 : 1;
    await db.ladderParticipant.update({
      where: { ladderId_memberId: { ladderId: c.ladderId, memberId: winnerId } },
      data: { points: { increment: points }, matchesWon: { increment: 1 }, matchesPlayed: { increment: 1 } },
    });
    await db.ladderParticipant.update({
      where: {
        ladderId_memberId: {
          ladderId: c.ladderId,
          memberId: winner === "a" ? c.challengedId : c.challengerId,
        },
      },
      data: { matchesPlayed: { increment: 1 } },
    });
  }

  return db.challenge.update({
    where: { id: c.id },
    data: {
      status: "played",
      setsJson: JSON.stringify(input.sets),
      winnerId,
      validatedAt: new Date(),
    },
  });
}
