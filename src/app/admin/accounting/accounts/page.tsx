import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";

async function createAccount(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  await db.account.create({
    data: {
      tenantId: t.id,
      code: String(formData.get("code")),
      name: String(formData.get("name")),
      type: String(formData.get("type")),
    },
  });
  redirect("/admin/accounting/accounts");
}

export default async function Accounts() {
  const tenant = await requireCurrentTenant();
  const accs = await db.account.findMany({
    where: { tenantId: tenant.id }, orderBy: { code: "asc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Kontenrahmen" />
      <Table>
        <thead><tr><Th>Code</Th><Th>Name</Th><Th>Typ</Th></tr></thead>
        <tbody>
          {accs.map((a) => (
            <tr key={a.id}><Td className="font-mono">{a.code}</Td><Td>{a.name}</Td><Td>{a.type}</Td></tr>
          ))}
        </tbody>
      </Table>
      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neues Konto</h2>
        <form action={createAccount} className="grid grid-cols-3 gap-3">
          <FormField label="Code"><input name="code" placeholder="4000" required className={inputCls} /></FormField>
          <FormField label="Name"><input name="name" placeholder="Erlöse Mitgliedsbeitrag" required className={inputCls} /></FormField>
          <FormField label="Typ">
            <select name="type" className={inputCls}>
              <option value="revenue">Erlös</option>
              <option value="expense">Aufwand</option>
              <option value="asset">Aktiva</option>
              <option value="liability">Passiva</option>
              <option value="equity">Eigenkapital</option>
            </select>
          </FormField>
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
