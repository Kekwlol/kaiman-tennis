import { headers } from "next/headers";
import { db } from "./db";
import { notFound } from "next/navigation";

// Liefert den Basis-Pfad fuer Tenant-interne Links.
// - Auf Subdomain/Custom-Domain: leerer String (Links sind /reservierung etc.)
// - Auf Root mit Direct-Path: /tenant/{slug} als Prefix (Links werden /tenant/greinsfurth/reservierung)
export async function getTenantBasePath(slug: string): Promise<string> {
  const h = await headers();
  const source = h.get("x-tenant-source") || "root";
  if (source === "subdomain" || source === "custom-domain") return "";
  return `/tenant/${slug}`;
}

// Liest den Tenant aus den Headers die proxy.ts gesetzt hat.
// Für Server Components und Route Handlers gleichermaszen.
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
  return null;
}

export async function requireCurrentTenant() {
  const t = await getCurrentTenant();
  if (!t) notFound();
  return t;
}
