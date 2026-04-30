import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateMagicToken, getAuth } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";

const Schema = z.object({ email: z.string().email() });

async function requestMagicLink(formData: FormData) {
  "use server";
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`magic:${ip}`, 5, 15 * 60_000)) {
    throw new Error("RATE_LIMITED");
  }
  const parsed = Schema.parse({ email: formData.get("email") });
  const slug = h.get("x-tenant-slug");
  const tenant = slug
    ? await db.tenant.findUnique({ where: { slug } })
    : null;
  if (!tenant) {
    redirect("/login?sent=1"); // immer "OK" um Email-Probing zu verhindern
  }

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
      body: `Klicke auf diesen Link um dich einzuloggen (15 Minuten gueltig):\n\n${link}`,
    });
  }

  redirect("/login?sent=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const auth = await getAuth();
  if (auth) redirect(sp.next ?? "/admin");

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm max-w-md w-full">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Login</h1>
        <p className="text-sm text-stone-600 mb-6">
          Wir schicken dir einen Login-Link per E-Mail. Kein Passwort noetig.
        </p>

        {sp.sent && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
            ✓ Link geschickt — pruefe dein Postfach (15 Min gueltig).
          </div>
        )}
        {sp.error === "forbidden" && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
            Du hast keinen Zugriff auf diesen Bereich.
          </div>
        )}

        <form action={requestMagicLink} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-stone-600 mb-1.5">E-Mail</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 outline-none"
            />
          </label>
          <button
            type="submit"
            className="w-full px-5 py-2.5 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-700 transition-colors"
          >
            Login-Link senden
          </button>
        </form>
      </div>
    </div>
  );
}
