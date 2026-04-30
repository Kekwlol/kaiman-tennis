import { db } from "@/lib/db";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls, Card } from "@/components/admin-ui";
import { redirect, notFound } from "next/navigation";
import { reportResult } from "@/lib/ladder";
import { authedAdmin, logMutation } from "@/lib/server-action";

async function addParticipant(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const ladderId = String(formData.get("ladderId"));
  const memberId = String(formData.get("memberId"));
  // Tenant-Match: Ladder + Member muessen zum gleichen Tenant
  const ladder = await db.ladder.findFirst({ where: { id: ladderId, tenantId: ctx.tenant.id } });
  if (!ladder) throw new Error("LADDER_NOT_FOUND_OR_FORBIDDEN");
  const member = await db.member.findFirst({ where: { id: memberId, tenantId: ctx.tenant.id } });
  if (!member) throw new Error("MEMBER_NOT_FOUND_OR_FORBIDDEN");

  const last = await db.ladderParticipant.findFirst({
    where: { ladderId }, orderBy: { position: "desc" },
  });
  const created = await db.ladderParticipant.create({
    data: { ladderId, memberId, position: (last?.position ?? 0) + 1 },
  });
  await logMutation(ctx, "LadderParticipant", created.id, "create", null, { ladderId, memberId });
  redirect(`/admin/ladders/${ladderId}`);
}

async function recordResult(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const challengeId = String(formData.get("challengeId"));
  const ladderId = String(formData.get("ladderId"));

  // Tenant-Match: Challenge muss zum Tenant gehoeren via Ladder
  const challenge = await db.challenge.findFirst({
    where: { id: challengeId, ladder: { tenantId: ctx.tenant.id } },
  });
  if (!challenge) throw new Error("CHALLENGE_NOT_FOUND_OR_FORBIDDEN");

  const setsRaw = String(formData.get("sets"));
  const sets = setsRaw.split(",").map((s) => s.split(":").map(Number));
  // Validierung: Sets muessen gueltige Tennis-Scores sein
  for (const [a, b] of sets) {
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a > 99 || b > 99) {
      throw new Error("INVALID_SCORE");
    }
  }
  await reportResult({ challengeId, sets });
  await logMutation(ctx, "Challenge", challengeId, "update", null, { sets });
  redirect(`/admin/ladders/${ladderId}`);
}

export default async function LadderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authedAdmin();
  const ladder = await db.ladder.findFirst({
    where: { id, tenantId: ctx.tenant.id },
    include: {
      participants: { include: { member: true }, orderBy: [{ position: "asc" }, { points: "desc" }] },
      challenges: {
        where: { status: { in: ["pending", "accepted"] } },
        include: { challenger: true, challenged: true },
      },
    },
  });
  if (!ladder) notFound();

  const memberPool = await db.member.findMany({
    where: {
      tenantId: ctx.tenant.id,
      status: "active",
      NOT: { ladderEntries: { some: { ladderId: ladder.id } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader title={ladder.name} desc={`${ladder.format} · ${ladder.category}`} />

      <Card className="p-5">
        <h2 className="font-bold mb-4">
          {ladder.format === "points" ? "Rangliste" : "Pyramide"}
        </h2>
        <Table>
          <thead><tr>
            <Th>Pos</Th><Th>Spieler</Th><Th>Skill</Th>
            {ladder.format === "points" ? <Th>Punkte</Th> : null}
            <Th>Spiele</Th><Th>Siege</Th>
          </tr></thead>
          <tbody>
            {ladder.participants.map((p) => (
              <tr key={p.id}>
                <Td className="font-bold">{p.position}</Td>
                <Td>{p.member.name}</Td>
                <Td className="text-xs">{p.member.skillScore}</Td>
                {ladder.format === "points" ? <Td>{p.points}</Td> : null}
                <Td>{p.matchesPlayed}</Td>
                <Td>{p.matchesWon}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <form action={addParticipant} className="mt-4 flex gap-2 items-end">
          <input type="hidden" name="ladderId" value={ladder.id} />
          <FormField label="Spieler hinzufuegen">
            <select name="memberId" className={inputCls}>
              {memberPool.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </FormField>
          <Btn type="submit">+ Hinzufuegen</Btn>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-4">Offene Forderungen</h2>
        {ladder.challenges.length === 0 && <p className="text-sm text-zinc-500">Keine.</p>}
        <ul className="space-y-3">
          {ladder.challenges.map((c) => (
            <li key={c.id} className="flex justify-between items-center border-b border-zinc-900 pb-3 text-sm">
              <span>{c.challenger.name} → {c.challenged.name}</span>
              <span className="text-xs text-zinc-500">Frist: {c.deadline.toLocaleDateString("de-AT")}</span>
              <form action={recordResult} className="flex gap-2 items-center text-xs">
                <input type="hidden" name="challengeId" value={c.id} />
                <input type="hidden" name="ladderId" value={ladder.id} />
                <input
                  name="sets"
                  placeholder="6:4,3:6,7:5"
                  className={inputCls + " w-32"}
                />
                <button className="text-[#EEFF00]">Ergebnis</button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
