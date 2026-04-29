import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { getTenantBasePath } from "@/lib/tenant-context";

async function loadTenant(ident: string) {
  const decoded = decodeURIComponent(ident);
  return db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
  });
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ident: string }>;
}) {
  const { ident } = await params;
  const tenant = await loadTenant(ident);
  if (!tenant) notFound();

  const accent = tenant.primaryColor;
  const base = await getTenantBasePath(tenant.slug);
  const nav = [
    { href: `${base}/`, label: "Home" },
    { href: `${base}/reservierung`, label: "Reservierung" },
    { href: `${base}/sessions`, label: "Open Play" },
    { href: `${base}/forderung`, label: "Forderung" },
    { href: `${base}/turniere`, label: "Turniere" },
    { href: `${base}/mannschaften`, label: "Mannschaften" },
    { href: `${base}/kurse`, label: "Kurse" },
    { href: `${base}/news`, label: "News" },
    { href: `${base}/me`, label: "Mein Bereich" },
  ];

  return (
    <div
      className="min-h-screen bg-stone-50 text-stone-900"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <Link href={`${base}/`} className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: accent, color: pickContrast(accent) }}
            >
              {tenant.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <div className="font-semibold tracking-tight">{tenant.name}</div>
              <div className="text-[10px] text-stone-400">powered by Kaiman Tennis</div>
            </div>
          </Link>
          <nav className="flex flex-wrap gap-x-1 gap-y-1 text-sm">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-full text-stone-700 hover:bg-stone-100 transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-12">{children}</main>
      <footer className="border-t border-stone-200 mt-16 py-8 text-center text-xs text-stone-400 bg-white">
        <Link href={`/admin?_tenant=${tenant.slug}`} className="hover:text-stone-700">→ Admin-Panel</Link>
      </footer>
    </div>
  );
}

// Hilfsfunktion: schwarz oder weiss als Vordergrund je nach Background-Helligkeit
function pickContrast(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "#000";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#000" : "#fff";
}
