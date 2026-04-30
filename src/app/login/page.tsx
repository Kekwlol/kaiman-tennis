import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateMagicToken, getAuth, createSession } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";

const PasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const MagicSchema = z.object({ email: z.string().email() });

async function loginPassword(formData: FormData) {
  "use server";
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000)) redirect("/login?error=ratelimit");

  const parsed = PasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=invalid");

  // Tenant aus Header (Subdomain in Production) oder aus FormData-Hidden-Field (Demo-Override)
  const slug = h.get("x-tenant-slug") || String(formData.get("_tenant") ?? "");
  const tenant = slug ? await db.tenant.findUnique({ where: { slug } }) : null;
  if (!tenant) redirect("/login?error=no-tenant");

  const user = await db.user.findFirst({
    where: { tenantId: tenant!.id, email: parsed.data!.email },
  });
  if (!user || !user.passwordHash) {
    await bcrypt.compare("dummy", "$2a$10$invalidvalidvalidvalidvalidvalidvalidvalidvalidvalidva");
    redirect("/login?error=invalid");
  }
  const ok = await bcrypt.compare(parsed.data!.password, user.passwordHash);
  if (!ok) redirect("/login?error=invalid");

  await createSession(user.id);
  redirect("/admin");
}

async function requestMagicLink(formData: FormData) {
  "use server";
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`magic:${ip}`, 5, 15 * 60_000)) redirect("/login?error=ratelimit");

  const parsed = MagicSchema.parse({ email: formData.get("email") });
  // Tenant aus Header (Subdomain in Production) oder aus FormData-Hidden-Field (Demo-Override)
  const slug = h.get("x-tenant-slug") || String(formData.get("_tenant") ?? "");
  const tenant = slug ? await db.tenant.findUnique({ where: { slug } }) : null;
  if (!tenant) redirect("/login?sent=1");

  const user = await db.user.findFirst({
    where: { tenantId: tenant!.id, email: parsed.email },
  });
  if (user) {
    const token = generateMagicToken(parsed.email, tenant!.id);
    const baseUrl = process.env.NEXT_PUBLIC_ROOT_DOMAIN
      ? `https://${tenant!.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
      : `http://localhost:3000`;
    const link = `${baseUrl}/login/verify?token=${encodeURIComponent(token)}`;
    await notify({
      tenantId: tenant!.id,
      memberId: user.memberId,
      channel: "email",
      template: "magic_link",
      subject: `Login-Link fuer ${tenant!.name}`,
      body: `Klicke auf diesen Link um dich einzuloggen (15 Minuten gueltig):\n\n${link}\n\nWenn du das nicht warst, ignoriere diese E-Mail.`,
    });
  }
  redirect("/login?sent=1");
}

const ERROR_MSG: Record<string, string> = {
  invalid: "Falsche E-Mail oder Passwort.",
  ratelimit: "Zu viele Versuche. Warte 15 Minuten.",
  forbidden: "Kein Zugriff auf diesen Bereich.",
  "no-tenant": "Kein Verein erkannt.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; next?: string; error?: string; _tenant?: string }>;
}) {
  const sp = await searchParams;
  const auth = await getAuth();
  if (auth) redirect(sp.next ?? "/admin");

  // Tenant aus Header oder Override-Param (Demo)
  const h = await import("next/headers").then((m) => m.headers());
  const tenantSlug = (await h).get("x-tenant-slug") || sp._tenant || "";

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm max-w-md w-full">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Login</h1>
        <p className="text-sm text-stone-600 mb-6">
          Admins: E-Mail + Passwort. Mitglieder: Magic-Link per E-Mail.
        </p>

        {sp.sent && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
            ✓ Link geschickt — pruefe dein Postfach (15 Min gueltig).
          </div>
        )}
        {sp.error && ERROR_MSG[sp.error] && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
            {ERROR_MSG[sp.error]}
          </div>
        )}

        <form action={loginPassword} className="space-y-3 mb-6">
          {tenantSlug && <input type="hidden" name="_tenant" value={tenantSlug} />}
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
            Admin-Login
          </h2>
          <input
            type="email"
            name="email"
            placeholder="admin@deinverein.demo"
            required
            autoComplete="email"
            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 outline-none"
          />
          <input
            type="password"
            name="password"
            placeholder="Passwort"
            required
            autoComplete="current-password"
            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 outline-none"
          />
          <button
            type="submit"
            className="w-full px-5 py-2.5 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-700 transition-colors"
          >
            Einloggen
          </button>
        </form>

        <div className="border-t border-stone-200 pt-6">
          <form action={requestMagicLink} className="space-y-3">
            {tenantSlug && <input type="hidden" name="_tenant" value={tenantSlug} />}
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
              Mitglieder-Login (Magic-Link)
            </h2>
            <input
              type="email"
              name="email"
              placeholder="deine@email.com"
              required
              autoComplete="email"
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 outline-none"
            />
            <button
              type="submit"
              className="w-full px-5 py-2.5 rounded-full border border-stone-300 hover:bg-stone-50 font-medium transition-colors"
            >
              Login-Link senden
            </button>
          </form>
        </div>

        <p className="text-xs text-stone-400 text-center mt-6">
          Neuer Verein?{" "}
          <a href="/admin/onboarding" className="underline hover:text-stone-600">
            30 Tage gratis testen →
          </a>
        </p>
      </div>
    </div>
  );
}
