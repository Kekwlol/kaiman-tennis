import { NextRequest, NextResponse } from "next/server";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kaiman.studio";

// Liefert dem Vereins-Admin die DNS-Anweisungen
export function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain") ?? "deine-domain.at";
  return NextResponse.json({
    summary: `Verbinde ${domain} mit Kaiman Tennis`,
    steps: [
      {
        step: 1,
        title: "DNS-CNAME-Record anlegen",
        type: "CNAME",
        host: domain.startsWith("www.") ? "www" : "@",
        target: ROOT,
        ttl: 3600,
      },
      {
        step: 2,
        title: "Domain im Admin verifizieren",
        action: "POST /api/admin/domains/verify",
      },
      {
        step: 3,
        title: "SSL-Zertifikat",
        info: "Wird automatisch via Let's Encrypt / ACME ausgestellt — keine Aktion nötig",
      },
    ],
    propagationNote: "DNS-Änderungen können bis zu 48h brauchen.",
  });
}
