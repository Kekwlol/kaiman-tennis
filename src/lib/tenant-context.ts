import { headers, cookies } from "next/headers";
import { db } from "./db";
import { notFound } from "next/navigation";
import { createHash } from "node:crypto";

// Liefert den Basis-Pfad fuer Tenant-interne Links.
export async function getTenantBasePath(slug: string): Promise<string> {
  const h = await headers();
  const source = h.get("x-tenant-source") || "root";
  if (source === "subdomain" || source === "custom-domain") return "";
  return `/tenant/${slug}`;
}

// Liest Tenant aus 1) Header (Subdomain) 2) eingeloggter Session 3) gibt null
export async function getCurrentTenant() {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const host = h.get("x-tenant-host");

  if (slug) {
    const t = await db.tenant.findUnique({ where: { slug } });
    if (t) return t;
  }
  if (host) {
    const t = await db.tenant.findUnique({ where: { customDomain: host } });
    if (t) return t;
  }
  // Fallback: Session-User → sein Tenant
  const c = await cookies();
  const sessionToken = c.get("kt_session")?.value;
  if (sessionToken) {
    const hashed = createHash("sha256").update(sessionToken).digest("hex");
    const session = await db.session.findUnique({
      where: { token: hashed },
      include: { user: { include: { tenant: true } } },
    });
    if (session && session.expiresAt > new Date()) {
      return session.user.tenant;
    }
  }
  return null;
}

export async function requireCurrentTenant() {
  const t = await getCurrentTenant();
  if (!t) notFound();
  return t;
}
