import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Card, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";

async function updateTenant(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await db.tenant.update({
    where: { id },
    data: {
      name: String(formData.get("name")),
      primaryColor: String(formData.get("primaryColor")),
      logoUrl: String(formData.get("logoUrl") ?? "") || null,
      currency: String(formData.get("currency")),
      vatNumber: String(formData.get("vatNumber") ?? "") || null,
      iban: String(formData.get("iban") ?? "") || null,
    },
  });
  redirect("/admin/settings");
}

export default async function Settings() {
  const tenant = await requireCurrentTenant();
  return (
    <div className="space-y-8">
      <PageHeader title="Einstellungen" />
      <Card className="p-5">
        <h2 className="font-bold mb-4">Verein</h2>
        <form action={updateTenant} className="grid grid-cols-2 gap-3 max-w-2xl">
          <input type="hidden" name="id" value={tenant.id} />
          <FormField label="Name"><input name="name" defaultValue={tenant.name} className={inputCls} /></FormField>
          <FormField label="Akzent-Farbe"><input name="primaryColor" type="color" defaultValue={tenant.primaryColor} className={inputCls} /></FormField>
          <FormField label="Logo-URL"><input name="logoUrl" defaultValue={tenant.logoUrl ?? ""} className={inputCls} /></FormField>
          <FormField label="Währung">
            <select name="currency" defaultValue={tenant.currency} className={inputCls}>
              <option value="EUR">EUR</option>
              <option value="CHF">CHF</option>
              <option value="GBP">GBP</option>
            </select>
          </FormField>
          <FormField label="UID"><input name="vatNumber" defaultValue={tenant.vatNumber ?? ""} className={inputCls} /></FormField>
          <FormField label="IBAN"><input name="iban" defaultValue={tenant.iban ?? ""} className={inputCls} /></FormField>
          <div className="col-span-2"><Btn type="submit">Speichern</Btn></div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-2">API-Key (Widget)</h2>
        <p className="text-sm text-zinc-400 mb-3">Für Strategie 3: JS-Widget auf fremden Seiten.</p>
        <code className="block bg-zinc-900 p-3 text-xs break-all">{tenant.apiKey}</code>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-2">Custom Domain</h2>
        <p className="text-sm text-zinc-400">Aktuelle Subdomain: <strong>{tenant.slug}</strong></p>
        <p className="text-sm text-zinc-400">Custom Domain: <strong>{tenant.customDomain ?? "—"}</strong> ({tenant.domainStatus})</p>
        <pre className="bg-zinc-900 p-3 text-xs mt-3 overflow-x-auto">
{`# Trage diesen DNS-Record ein:
DEINE-DOMAIN.AT    CNAME    kaiman.studio

# Dann verifiziere:
curl -X POST https://kaiman.studio/api/admin/domains/verify \\
  -H "content-type: application/json" \\
  -d '{"tenantSlug":"${tenant.slug}","customDomain":"DEINE-DOMAIN.AT"}'`}
        </pre>
      </Card>
    </div>
  );
}
