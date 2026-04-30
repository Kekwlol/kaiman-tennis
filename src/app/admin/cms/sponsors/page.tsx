import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { authedAdmin } from "@/lib/server-action";
import { redirect } from "next/navigation";

async function createSponsor(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const t = ctx.tenant;
  await db.sponsor.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      logoUrl: String(formData.get("logoUrl") ?? "") || null,
      link: String(formData.get("link") ?? "") || null,
    },
  });
  redirect("/admin/cms/sponsors");
}

export default async function Sponsors() {
  const tenant = await requireCurrentTenant();
  const sps = await db.sponsor.findMany({ where: { tenantId: tenant.id } });
  return (
    <div className="space-y-8">
      <PageHeader title="Sponsoren" />
      <Table>
        <thead><tr><Th>Name</Th><Th>Link</Th><Th>Klicks</Th><Th>Gültig bis</Th></tr></thead>
        <tbody>
          {sps.map((s) => (
            <tr key={s.id}>
              <Td>{s.name}</Td>
              <Td className="text-xs">{s.link}</Td>
              <Td>{s.clicks}</Td>
              <Td>{s.validUntil?.toLocaleDateString("de-AT") ?? "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neuer Sponsor</h2>
        <form action={createSponsor} className="grid grid-cols-3 gap-3 max-w-3xl">
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Logo-URL"><input name="logoUrl" className={inputCls} /></FormField>
          <FormField label="Link"><input name="link" className={inputCls} /></FormField>
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
