import { db } from "./db";

const ROOT_DOMAINS = [
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kaiman.studio",
  process.env.NEXT_PUBLIC_DEV_DOMAIN ?? "lvh.me:3000",
  "localhost:3000",
  "lvh.me",
  "localhost",
  "127.0.0.1",
  "127.0.0.1:3000",
  "kaiman-tennis.vercel.app",
];

// Vercel-Preview-URLs: kaiman-tennis-xxx-kaidigital.vercel.app
function isVercelPreview(host: string): boolean {
  return /\.vercel\.app$/.test(host);
}

export type TenantSource = "subdomain" | "custom-domain" | "root";

export type TenantContext = {
  source: TenantSource;
  slug: string | null;
  hostname: string;
};

// Parst hostname -> Tenant-Slug oder null (= Root-Marketing-Site)
// Strategie 1: foo.kaiman.studio -> slug "foo"
// Strategie 2: tc-greinsfurth.at -> custom domain lookup
export function parseTenant(hostname: string): TenantContext {
  const cleanHost = hostname.toLowerCase().replace(/^www\./, "");

  // Root-Domain selbst -> kein Tenant
  if (ROOT_DOMAINS.includes(cleanHost) || isVercelPreview(cleanHost)) {
    return { source: "root", slug: null, hostname: cleanHost };
  }

  // Subdomain auf Root-Domain (Strategie 1)
  for (const root of ROOT_DOMAINS) {
    if (cleanHost.endsWith(`.${root}`)) {
      const slug = cleanHost.slice(0, -1 - root.length);
      // Nested subdomains (a.b.kaiman.studio) -> nicht erlaubt
      if (slug.includes(".")) continue;
      return { source: "subdomain", slug, hostname: cleanHost };
    }
  }

  // Custom Domain (Strategie 2) -> DB-Lookup im Caller
  return { source: "custom-domain", slug: null, hostname: cleanHost };
}

// Löschresistenter Tenant-Lookup (mit Cache-Tag für ISR)
export async function resolveTenant(ctx: TenantContext) {
  if (ctx.source === "subdomain" && ctx.slug) {
    return db.tenant.findUnique({ where: { slug: ctx.slug } });
  }
  if (ctx.source === "custom-domain") {
    return db.tenant.findUnique({ where: { customDomain: ctx.hostname } });
  }
  return null;
}
