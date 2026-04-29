import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { promises as dns } from "node:dns";

const Body = z.object({
  tenantSlug: z.string(),
  customDomain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i),
});

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kaiman.studio";

// Strategie 2: Custom Domain Verification
// Verein traegt CNAME ein: tc-greinsfurth.at -> kaiman.studio
// Wir prüfen DNS, dann markieren wir verified.
// SSL/TLS macht der Hosting-Provider (Vercel oder Caddy on-demand TLS)
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({
    where: { slug: parsed.data.tenantSlug },
  });
  if (!tenant) {
    return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
  }

  let cnameOk = false;
  let cnameTarget: string[] = [];
  try {
    cnameTarget = await dns.resolveCname(parsed.data.customDomain);
    cnameOk = cnameTarget.some(
      (t) => t === ROOT || t.endsWith(`.${ROOT}`),
    );
  } catch {
    cnameOk = false;
  }

  if (!cnameOk) {
    return NextResponse.json(
      {
        error: "DNS_NOT_CONFIGURED",
        instruction: `Trage einen CNAME-Record ein: ${parsed.data.customDomain} -> ${ROOT}`,
        currentCname: cnameTarget,
      },
      { status: 422 },
    );
  }

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      customDomain: parsed.data.customDomain,
      domainStatus: "verified",
    },
  });

  // In Production: hier Vercel/Caddy API-Call um Domain hinzuzufuegen
  // (SSL-Cert via ACME, on-demand TLS, etc.)
  // Beispiel Vercel: POST /v9/projects/{id}/domains
  // Beispiel Caddy:  PATCH /config/apps/http/servers/.../routes

  return NextResponse.json({
    ok: true,
    tenant: { slug: tenant.slug, customDomain: parsed.data.customDomain },
    note: "DNS verifiziert. SSL-Cert wird automatisch ausgestellt (Provider-spezifisch).",
  });
}
