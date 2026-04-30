import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { promises as dns } from "node:dns";
import { requireTenantAdmin } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const Body = z.object({
  customDomain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i).max(120),
});

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kaiman.studio";

export async function POST(req: NextRequest) {
  // Rate-Limit: max 10/h pro IP (verhindert DNS-Probing)
  const ip = getClientIp(req.headers);
  if (!rateLimit(`domains:${ip}`, 10, 3600_000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  // AUTH: Nur eingeloggter TenantAdmin darf Custom-Domain setzen
  const slug = req.headers.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "MISSING_TENANT" }, { status: 400 });
  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });

  try {
    await requireTenantAdmin(tenant.id);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  // Verhindere Hijacking: Pruefe ob Domain schon einem anderen Tenant gehoert
  const existing = await db.tenant.findUnique({
    where: { customDomain: parsed.data.customDomain },
  });
  if (existing && existing.id !== tenant.id) {
    return NextResponse.json({ error: "DOMAIN_TAKEN" }, { status: 409 });
  }

  // CNAME-Verify
  let cnameOk = false;
  let cnameTarget: string[] = [];
  try {
    cnameTarget = await dns.resolveCname(parsed.data.customDomain);
    cnameOk = cnameTarget.some((t) => t === ROOT || t.endsWith(`.${ROOT}`));
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
    data: { customDomain: parsed.data.customDomain, domainStatus: "verified" },
  });

  return NextResponse.json({
    ok: true,
    tenant: { slug: tenant.slug, customDomain: parsed.data.customDomain },
  });
}
