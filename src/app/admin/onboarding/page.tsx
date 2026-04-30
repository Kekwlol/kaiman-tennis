// Onboarding-Wizard: Neuer Vereins-Tenant + erster Admin-User.
// Nur fuer Superadmin oder offen wenn ALLOW_TENANT_OVERRIDE=1
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAuth, createSession } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PageHeader, Btn, FormField, inputCls } from "@/components/admin-ui";

const ALLOW = process.env.NODE_ENV !== "production" || process.env.ALLOW_TENANT_OVERRIDE === "1";

const Schema = z.object({
  tenantName: z.string().min(2).max(120),
  tenantSlug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(80),
  adminName: z.string().min(2).max(120),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function createTenant(formData: FormData) {
  "use server";
  if (!ALLOW) {
    const auth = await getAuth();
    if (!auth || auth.role !== "superadmin") throw new Error("FORBIDDEN");
  }

  const parsed = Schema.parse({
    tenantName: formData.get("tenantName"),
    tenantSlug: formData.get("tenantSlug"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
    adminName: formData.get("adminName"),
    primaryColor: formData.get("primaryColor") || undefined,
  });

  // Slug-Konflikt pruefen
  const existing = await db.tenant.findUnique({ where: { slug: parsed.tenantSlug } });
  if (existing) throw new Error("SLUG_TAKEN");

  const passwordHash = await bcrypt.hash(parsed.adminPassword, 10);
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30d Trial

  const result = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug: parsed.tenantSlug,
        name: parsed.tenantName,
        primaryColor: parsed.primaryColor ?? "#16a34a",
        plan: "trial",
        trialEndsAt,
      },
    });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: parsed.adminEmail,
        name: parsed.adminName,
        role: "tenantAdmin",
        passwordHash,
      },
    });
    return { tenant, user };
  });

  await createSession(result.user.id);
  redirect(`/admin?welcome=1`);
}

export default async function Onboarding() {
  if (!ALLOW) {
    const auth = await getAuth();
    if (!auth || auth.role !== "superadmin") redirect("/login");
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <PageHeader title="Verein erstellen" desc="30 Tage gratis testen" />
      <form action={createTenant} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <FormField label="Vereinsname" hint="z.B. TC Greinsfurth">
          <input name="tenantName" required className={inputCls} />
        </FormField>
        <FormField label="URL-Slug" hint="dein-verein.kaiman.studio (nur Kleinbuchstaben + Bindestrich)">
          <input name="tenantSlug" required pattern="[a-z0-9-]{2,40}" className={inputCls} />
        </FormField>
        <FormField label="Akzent-Farbe" hint="Hauptfarbe deines Vereins">
          <input name="primaryColor" type="color" defaultValue="#16a34a" className={inputCls} />
        </FormField>
        <hr className="border-stone-200" />
        <FormField label="Dein Name">
          <input name="adminName" required className={inputCls} />
        </FormField>
        <FormField label="Deine E-Mail">
          <input name="adminEmail" type="email" required className={inputCls} />
        </FormField>
        <FormField label="Passwort" hint="mind. 8 Zeichen">
          <input name="adminPassword" type="password" required minLength={8} className={inputCls} />
        </FormField>
        <p className="text-xs text-stone-500">
          Mit dem Klick auf &quot;Erstellen&quot; akzeptierst du unsere{" "}
          <a href="/legal/agb" className="underline">AGB</a> und{" "}
          <a href="/legal/datenschutz" className="underline">Datenschutzerklärung</a>.
        </p>
        <Btn type="submit">Verein erstellen — 30 Tage gratis</Btn>
      </form>
    </div>
  );
}
