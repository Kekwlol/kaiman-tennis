import { NextRequest, NextResponse } from "next/server";
import { parseTenant } from "@/lib/tenant";

export const config = {
  matcher: ["/((?!api/widget|_next|favicon.ico|widget.js|.*\\..*).*)"],
};

export function proxy(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const url = req.nextUrl.clone();

  // Override: ?_tenant=greinsfurth simuliert Subdomain (auch in Production fuer Demo-Zwecke)
  const tenantOverride = url.searchParams.get("_tenant");
  let ctx = parseTenant(hostname);
  if (tenantOverride && ctx.source === "root") {
    ctx = { source: "subdomain", slug: tenantOverride, hostname };
  }

  // Pfade die immer auf Root-Marketing zeigen
  const isAdminPath = url.pathname.startsWith("/admin");
  const isApiPath = url.pathname.startsWith("/api");

  // Root-Domain -> Marketing-Seite
  if (ctx.source === "root") {
    if (url.pathname === "/") {
      url.pathname = "/marketing";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Tenant erkannt (Subdomain oder Custom Domain)
  // -> Rewrite auf /tenant/[slug-or-host]/...
  if (isApiPath || isAdminPath) {
    // API/Admin haben eigene Tenant-Resolution via Header
    const res = NextResponse.next();
    res.headers.set("x-tenant-source", ctx.source);
    res.headers.set("x-tenant-slug", ctx.slug ?? "");
    res.headers.set("x-tenant-host", ctx.hostname);
    return res;
  }

  const ident = ctx.slug ?? ctx.hostname;
  url.pathname = `/tenant/${encodeURIComponent(ident)}${url.pathname}`;
  const res = NextResponse.rewrite(url);
  res.headers.set("x-tenant-source", ctx.source);
  res.headers.set("x-tenant-slug", ctx.slug ?? "");
  res.headers.set("x-tenant-host", ctx.hostname);
  return res;
}
