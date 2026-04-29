import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Card, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect, notFound } from "next/navigation";
import { generateBracket, reportMatch } from "@/lib/tournament";

async function regEntry(formData: FormData) {
  "use server";
  const tournamentId = String(formData.get("tournamentId"));
  await db.tournamentEntry.create({
    data: {
      tournamentId,
      memberId: String(formData.get("memberId")) || null,
      seed: numOrNull(formData.get("seed")),
    },
  });
  redirect(`/admin/tournaments/${tournamentId}`);
}

async function buildBracket(formData: FormData) {
  "use server";
  const id = String(formData.get("tournamentId"));
  await generateBracket(id);
  redirect(`/admin/tournaments/${id}`);
}

async function record(formData: FormData) {
  "use server";
  const matchId = String(formData.get("matchId"));
  const sets = String(formData.get("sets")).split(",").map((s) => s.split(":").map(Number));
  await reportMatch({ matchId, sets });
  const tournamentId = String(formData.get("tournamentId"));
  redirect(`/admin/tournaments/${tournamentId}`);
}

function numOrNull(v: FormDataEntryValue | null) {
  if (!v) return null;
  const n = parseInt(String(v));
  return isNaN(n) ? null : n;
}

export default async function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await requireCurrentTenant();
  const t = await db.tournament.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      entries: { include: { member: true }, orderBy: { seed: "asc" } },
      matches: { orderBy: [{ round: "asc" }, { slot: "asc" }] },
    },
  });
  if (!t) notFound();

  const members = await db.member.findMany({
    where: { tenantId: tenant.id, status: "active" },
    orderBy: { name: "asc" },
  });

  const matchesByRound: Record<number, typeof t.matches> = {};
  for (const m of t.matches) {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t.name} desc={`${t.format} · Status: ${t.status}`} />

      <Card className="p-5">
        <h2 className="font-bold mb-4">Anmeldungen ({t.entries.length}/{t.drawSize})</h2>
        <Table>
          <thead><tr><Th>Seed</Th><Th>Spieler</Th><Th>Bezahlt</Th></tr></thead>
          <tbody>
            {t.entries.map((e) => (
              <tr key={e.id}>
                <Td>{e.seed ?? "—"}</Td>
                <Td>{e.member?.name ?? e.guestName}</Td>
                <Td>{e.paid ? "Ja" : "Nein"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <form action={regEntry} className="mt-4 flex gap-2 items-end">
          <input type="hidden" name="tournamentId" value={t.id} />
          <FormField label="Spieler">
            <select name="memberId" className={inputCls}>
              <option value="">— Gast —</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </FormField>
          <FormField label="Seed"><input name="seed" type="number" className={inputCls + " w-20"} /></FormField>
          <Btn type="submit">Anmelden</Btn>
        </form>
      </Card>

      {t.status === "registration" && t.entries.length >= 2 && (
        <form action={buildBracket}>
          <input type="hidden" name="tournamentId" value={t.id} />
          <Btn type="submit">Bracket generieren</Btn>
        </form>
      )}

      {Object.keys(matchesByRound).length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold mb-4">Bracket</h2>
          <div className="space-y-6">
            {Object.entries(matchesByRound).map(([round, matches]) => (
              <div key={round}>
                <h3 className="text-xs uppercase text-zinc-500 mb-2">Runde {round}</h3>
                <ul className="space-y-2">
                  {matches.map((m) => {
                    const a = t.entries.find((e) => e.id === m.playerAEntryId);
                    const b = t.entries.find((e) => e.id === m.playerBEntryId);
                    return (
                      <li key={m.id} className="flex items-center gap-3 text-sm border-b border-zinc-900 pb-2">
                        <span className="w-32">{a?.member?.name ?? a?.guestName ?? "—"}</span>
                        <span className="text-zinc-500">vs</span>
                        <span className="w-32">{b?.member?.name ?? b?.guestName ?? "—"}</span>
                        {m.winnerEntryId ? (
                          <span className="ml-auto text-[#EEFF00] text-xs">{m.setsJson}</span>
                        ) : a && b ? (
                          <form action={record} className="ml-auto flex gap-2 items-center text-xs">
                            <input type="hidden" name="matchId" value={m.id} />
                            <input type="hidden" name="tournamentId" value={t.id} />
                            <input name="sets" placeholder="6:4,6:3" className={inputCls + " w-28"} />
                            <button className="text-[#EEFF00]">OK</button>
                          </form>
                        ) : (
                          <span className="ml-auto text-zinc-600 text-xs">wartet</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
