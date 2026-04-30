import { db } from "@/lib/db";
import { PageHeader, Btn, Card, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";
import { authedAdmin, logMutation } from "@/lib/server-action";
import { z } from "zod";

const TenantSchema = z.object({
  name: z.string().min(1).max(120),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  logoUrl: z.string().url().or(z.literal("")).optional(),
  currency: z.enum(["EUR", "CHF", "GBP"]),
  vatNumber: z.string().max(40).optional(),
  iban: z.string().max(40).optional(),
});

async function updateTenant(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const parsed = TenantSchema.parse({
    name: formData.get("name"),
    primaryColor: formData.get("primaryColor"),
    logoUrl: formData.get("logoUrl") ?? "",
    currency: formData.get("currency"),
    vatNumber: formData.get("vatNumber") ?? "",
    iban: formData.get("iban") ?? "",
  });
  // Tenant aus Kontext - NICHT aus FormData! (Cross-Tenant-Verhinderung)
  const before = { name: ctx.tenant.name, primaryColor: ctx.tenant.primaryColor };
  await db.tenant.update({
    where: { id: ctx.tenant.id },
    data: {
      name: parsed.name,
      primaryColor: parsed.primaryColor,
      logoUrl: parsed.logoUrl || null,
      currency: parsed.currency,
      vatNumber: parsed.vatNumber || null,
      iban: parsed.iban || null,
    },
  });
  await logMutation(ctx, "Tenant", ctx.tenant.id, "update", before, parsed);
  redirect("/admin/settings");
}

async function rotateApiKey() {
  "use server";
  const ctx = await authedAdmin();
  const newKey = "kt_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  await db.tenant.update({ where: { id: ctx.tenant.id }, data: { apiKey: newKey } });
  await logMutation(ctx, "Tenant", ctx.tenant.id, "update", null, { apiKeyRotated: true });
  redirect("/admin/settings");
}

export default async function Settings() {
  const ctx = await authedAdmin();
  const tenant = ctx.tenant;
  return (
    <div className="space-y-8">
      <PageHeader title="Einstellungen" desc="Vereinskonfiguration und Sicherheit" />

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Verein</h2>
        <form action={updateTenant} className="grid grid-cols-2 gap-3 max-w-2xl">
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
          <FormField label="UID-Nummer"><input name="vatNumber" defaultValue={tenant.vatNumber ?? ""} className={inputCls} /></FormField>
          <FormField label="IBAN"><input name="iban" defaultValue={tenant.iban ?? ""} className={inputCls} /></FormField>
          <div className="col-span-2"><Btn type="submit">Speichern</Btn></div>
        </form>
      </Card>

      <Card className="p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold">API-Key (Widget)</h2>
          <form action={rotateApiKey}>
            <button className="text-xs text-amber-700 hover:text-amber-900">Neu generieren</button>
          </form>
        </div>
        <p className="text-sm text-stone-500 mb-3">Für Strategie 3: JS-Widget auf fremden Seiten.</p>
        <code className="block bg-stone-100 text-stone-800 p-3 text-xs break-all rounded">{tenant.apiKey}</code>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">Custom Domain</h2>
        <p className="text-sm text-stone-600">Aktuelle Subdomain: <strong>{tenant.slug}</strong></p>
        <p className="text-sm text-stone-600">Custom Domain: <strong>{tenant.customDomain ?? "—"}</strong> ({tenant.domainStatus})</p>
        <pre className="bg-stone-100 text-stone-800 p-3 text-xs mt-3 overflow-x-auto rounded">
{`# 1. DNS-CNAME-Record bei deinem Domain-Anbieter:
DEINE-DOMAIN.AT    CNAME    kaiman.studio

# 2. Im Admin-Panel die Domain hinzufuegen (kommt bald als UI).
# 3. SSL wird automatisch ausgestellt.`}
        </pre>
      </Card>
    </div>
  );
}
