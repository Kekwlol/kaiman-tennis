import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { authedAdmin } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { fmtMoney, parseMoney } from "@/lib/money";

const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

async function createSub(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const t = ctx.tenant;
  await db.subscription.create({
    data: {
      tenantId: t.id,
      memberId: String(formData.get("memberId")),
      courtId: String(formData.get("courtId")),
      weekday: parseInt(String(formData.get("weekday"))),
      hourFrom: parseInt(String(formData.get("hourFrom"))),
      hourTo: parseInt(String(formData.get("hourTo"))),
      validFrom: new Date(String(formData.get("validFrom"))),
      validUntil: new Date(String(formData.get("validUntil"))),
      pricePaid: parseMoney(String(formData.get("price"))),
    },
  });
  redirect("/admin/subscriptions");
}

export default async function SubsList() {
  const tenant = await requireCurrentTenant();
  const [subs, members, courts] = await Promise.all([
    db.subscription.findMany({
      where: { tenantId: tenant.id, active: true },
      include: { member: true, court: true },
      orderBy: [{ weekday: "asc" }, { hourFrom: "asc" }],
    }),
    db.member.findMany({ where: { tenantId: tenant.id, status: "active" }, orderBy: { name: "asc" } }),
    db.court.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { order: "asc" } }),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Abos" desc="Wiederkehrende Buchungen" />
      <Table>
        <thead><tr>
          <Th>Mitglied</Th><Th>Platz</Th><Th>Wochentag</Th><Th>Zeit</Th><Th>Gültig</Th><Th>Preis</Th>
        </tr></thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id}>
              <Td>{s.member.name}</Td>
              <Td>{s.court.name}</Td>
              <Td>{DAYS[s.weekday]}</Td>
              <Td>{s.hourFrom}-{s.hourTo}</Td>
              <Td className="text-xs">{s.validFrom.toLocaleDateString("de-AT")} - {s.validUntil.toLocaleDateString("de-AT")}</Td>
              <Td>{fmtMoney(s.pricePaid)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neues Abo</h2>
        <form action={createSub} className="grid grid-cols-3 gap-3 max-w-3xl">
          <FormField label="Mitglied">
            <select name="memberId" className={inputCls}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </FormField>
          <FormField label="Platz">
            <select name="courtId" className={inputCls}>
              {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Wochentag">
            <select name="weekday" className={inputCls}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </FormField>
          <FormField label="Stunde von"><input name="hourFrom" type="number" defaultValue={18} className={inputCls} /></FormField>
          <FormField label="Stunde bis"><input name="hourTo" type="number" defaultValue={19} className={inputCls} /></FormField>
          <FormField label="Preis"><input name="price" placeholder="120,00" className={inputCls} /></FormField>
          <FormField label="Gültig ab"><input name="validFrom" type="date" required className={inputCls} /></FormField>
          <FormField label="Gültig bis"><input name="validUntil" type="date" required className={inputCls} /></FormField>
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
