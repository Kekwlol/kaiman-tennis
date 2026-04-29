import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";
import { fmtMoney, parseMoney } from "@/lib/money";

async function createType(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  await db.membershipType.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      fee: parseMoney(String(formData.get("fee"))),
      durationMonths: parseInt(String(formData.get("durationMonths") ?? 12)),
      resultingGroup: String(formData.get("resultingGroup")),
      proratable: formData.get("proratable") === "on",
    },
  });
  redirect("/admin/membership-types");
}

export default async function MembershipTypesList() {
  const tenant = await requireCurrentTenant();
  const types = await db.membershipType.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { purchases: true } } },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Mitgliedschaftstypen" desc="Vorlagen für Beitrags-Modelle" />
      <Table>
        <thead><tr>
          <Th>Name</Th><Th>Beitrag</Th><Th>Dauer</Th><Th>Resultiert in</Th><Th>Pro-Rata</Th><Th>Verkäufe</Th>
        </tr></thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.id}>
              <Td>{t.name}</Td>
              <Td>{fmtMoney(t.fee)}</Td>
              <Td>{t.durationMonths} Monate</Td>
              <Td>{t.resultingGroup}</Td>
              <Td>{t.proratable ? "Ja" : "Nein"}</Td>
              <Td>{t._count.purchases}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neuer Typ</h2>
        <form action={createType} className="grid grid-cols-3 gap-3 max-w-3xl">
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Beitrag (Euro)"><input name="fee" placeholder="240,00" required className={inputCls} /></FormField>
          <FormField label="Dauer Monate"><input name="durationMonths" type="number" defaultValue={12} className={inputCls} /></FormField>
          <FormField label="Resultierende Gruppe">
            <select name="resultingGroup" className={inputCls}>
              <option value="adult">Erwachsen</option>
              <option value="child">Kind</option>
              <option value="youth">Jugend</option>
              <option value="senior">Senior</option>
              <option value="family">Familie</option>
            </select>
          </FormField>
          <FormField label="Pro-Rata bei Mid-Season">
            <input type="checkbox" name="proratable" defaultChecked className="mr-2" />
            <span className="text-sm">aktivieren</span>
          </FormField>
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
