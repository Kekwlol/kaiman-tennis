import { db } from "./db";

// Bracket-Generator für KO-Turniere
// Standard-Seeding: 1 vs N, 2 vs N-1, ...
export function buildKnockoutBracket(seeds: string[]): string[][] {
  // padded auf nächste 2er-Potenz
  const n = seeds.length;
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));
  const padded: (string | null)[] = [...seeds];
  while (padded.length < size) padded.push(null); // BYE

  // Standard-Tennis-Seeding-Order für 8: [1,8,4,5,2,7,3,6]
  // Allgemein: Mirror durch alle Runden
  const order = seedingOrder(size);
  const arranged = order.map((idx) => padded[idx - 1]);

  // Erste Runde paaren
  const firstRound: (string | null)[][] = [];
  for (let i = 0; i < size; i += 2) {
    firstRound.push([arranged[i] ?? null, arranged[i + 1] ?? null]);
  }
  return firstRound.map((p) => p.map((x) => x ?? "BYE"));
}

// Setze 1 oben, hoechste Seed unten in der gleichen Haelfte spiegelverkehrt
function seedingOrder(size: number): number[] {
  if (size === 1) return [1];
  const half = seedingOrder(size / 2);
  const result: number[] = [];
  for (const s of half) {
    result.push(s);
    result.push(size + 1 - s);
  }
  return result;
}

export async function generateBracket(tournamentId: string) {
  const t = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: { entries: { where: { withdrawn: false }, orderBy: { seed: "asc" } } },
  });
  if (!t) throw new Error("TOURNAMENT_NOT_FOUND");
  if (t.format !== "ko") throw new Error("FORMAT_NOT_SUPPORTED");

  const entries = t.entries;
  const seeds = entries.map((e) => e.id);
  const round1 = buildKnockoutBracket(seeds);

  // Erste Runde in DB anlegen
  await db.tournamentMatch.deleteMany({ where: { tournamentId } });

  for (let i = 0; i < round1.length; i++) {
    const [a, b] = round1[i];
    await db.tournamentMatch.create({
      data: {
        tournamentId,
        round: 1,
        slot: i,
        playerAEntryId: a === "BYE" ? null : a,
        playerBEntryId: b === "BYE" ? null : b,
        // Walkover wenn einer BYE
        walkover: a === "BYE" || b === "BYE",
        winnerEntryId: a === "BYE" ? b : b === "BYE" ? a : null,
      },
    });
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: "seeded" },
  });
}

// Ergebnis eintragen + ggf. nächste Runde freischalten
export async function reportMatch(input: { matchId: string; sets: number[][] }) {
  const m = await db.tournamentMatch.findUnique({
    where: { id: input.matchId },
    include: { tournament: true },
  });
  if (!m) throw new Error("MATCH_NOT_FOUND");
  if (m.winnerEntryId) throw new Error("ALREADY_DECIDED");
  if (!m.playerAEntryId || !m.playerBEntryId) throw new Error("MISSING_PLAYER");

  let setsA = 0;
  let setsB = 0;
  for (const [a, b] of input.sets) {
    if (a > b) setsA++;
    else if (b > a) setsB++;
  }
  const winner = setsA > setsB ? m.playerAEntryId : m.playerBEntryId;

  await db.tournamentMatch.update({
    where: { id: m.id },
    data: { setsJson: JSON.stringify(input.sets), winnerEntryId: winner },
  });

  // Nächste Runde mit Sieger füllen
  await advanceWinner(m.tournamentId, m.round, m.slot, winner);
}

async function advanceWinner(tournamentId: string, round: number, slot: number, winnerEntryId: string) {
  const nextRound = round + 1;
  const nextSlot = Math.floor(slot / 2);
  const isPlayerA = slot % 2 === 0;

  let nextMatch = await db.tournamentMatch.findFirst({
    where: { tournamentId, round: nextRound, slot: nextSlot },
  });

  if (!nextMatch) {
    nextMatch = await db.tournamentMatch.create({
      data: {
        tournamentId,
        round: nextRound,
        slot: nextSlot,
        playerAEntryId: isPlayerA ? winnerEntryId : null,
        playerBEntryId: isPlayerA ? null : winnerEntryId,
      },
    });
  } else {
    await db.tournamentMatch.update({
      where: { id: nextMatch.id },
      data: isPlayerA ? { playerAEntryId: winnerEntryId } : { playerBEntryId: winnerEntryId },
    });
  }
}
