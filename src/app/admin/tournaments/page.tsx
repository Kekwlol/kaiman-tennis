import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fmtMoney, parseMoney } from "@/lib/money";

async function createTournament(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  await db.tournament.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      format: String(formData.get("format")),
      matchType: String(formData.get("matchType")),
      drawSize: parseInt(String(formData.get("drawSize") ?? 16)),
      registrationOpen: new Date(String(formData.get("regOpen"))),
      registrationClose: new Date(String(formData.get("regClose"))),
      startsAt: new Date(String(formData.get("startsAt"))),
      endsAt: new Date(String(formData.get("endsAt"))),
      entryFee: parseMoney(String(formData.get("entryFee") ?? "0")),
      status: "registration",
    },
  });
  redirect("/admin/tournaments");
}

export default async function TournamentsList() {
  const tenant = await requireCurrentTenant();
  const ts = await db.tournament.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { entries: true, matches: true } } },
    orderBy: { startsAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Turniere" />
      <Table>
        <thead><tr>
          <Th>Name</Th><Th>Format</Th><Th>Status</Th><Th>Start</Th><Th>Anmeldungen</Th><Th>Gebühr</Th><Th></Th>
        </tr></thead>
        <tbody>
          {ts.map((t) => (
            <tr key={t.id}>
              <Td>{t.name}</Td>
              <Td>{t.format}</Td>
              <Td>{t.status}</Td>
              <Td>{t.startsAt.toLocaleDateString("de-AT")}</Td>
              <Td>{t._count.entries}/{t.drawSize}</Td>
              <Td>{fmtMoney(t.entryFee)}</Td>
              <Td>
                <Link href={`/admin/tournaments/${t.id}`} className="text-[#EEFF00] text-xs">Verwalten</Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neues Turnier</h2>
        <form action={createTournament} className="grid grid-cols-3 gap-3 max-w-3xl">
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Format">
            <select name="format" className={inputCls}>
              <option value="ko">KO</option>
              <option value="double_ko">Doppel-KO</option>
              <option value="roundrobin">Round Robin</option>
              <option value="swiss">Schweizer System</option>
            </select>
          </FormField>
          <FormField label="Match-Typ">
            <select name="matchType" className={inputCls}>
              <option value="singles">Einzel</option>
              <option value="doubles">Doppel</option>
              <option value="mixed">Mixed</option>
            </select>
          </FormField>
          <FormField label="Draw-Size"><input name="drawSize" type="number" defaultValue={16} className={inputCls} /></FormField>
          <FormField label="Anmelde-Gebühr"><input name="entryFee" placeholder="0,00" className={inputCls} /></FormField>
          <div />
          <FormField label="Anmeldung offen ab"><input name="regOpen" type="date" required className={inputCls} /></FormField>
          <FormField label="Anmeldung schließt"><input name="regClose" type="date" required className={inputCls} /></FormField>
          <div />
          <FormField label="Start"><input name="startsAt" type="date" required className={inputCls} /></FormField>
          <FormField label="Ende"><input name="endsAt" type="date" required className={inputCls} /></FormField>
          <div />
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
