import Link from "next/link";
import { requireCurrentTenant } from "@/lib/tenant-context";

const sections = [
  { title: "Verein", icon: "👥", items: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/members", label: "Mitglieder" },
    { href: "/admin/membership-types", label: "Mitgliedschaften" },
  ]},
  { title: "Reservierung", icon: "🎾", items: [
    { href: "/admin/bookings", label: "Buchungen" },
    { href: "/admin/courts", label: "Plätze" },
    { href: "/admin/rules", label: "Buchungsregeln" },
    { href: "/admin/prices", label: "Preiszonen" },
    { href: "/admin/subscriptions", label: "Abos" },
  ]},
  { title: "Vereinsleben", icon: "🏆", items: [
    { href: "/admin/ladders", label: "Forderungspyramiden" },
    { href: "/admin/tournaments", label: "Turniere" },
    { href: "/admin/teams", label: "Mannschaften" },
    { href: "/admin/courses", label: "Kurse / Camps" },
    { href: "/admin/match-requests", label: "Spielpartner-Suche" },
  ]},
  { title: "CMS", icon: "📰", items: [
    { href: "/admin/cms/news", label: "News" },
    { href: "/admin/cms/pages", label: "Seiten" },
    { href: "/admin/cms/newsletter", label: "Newsletter" },
    { href: "/admin/cms/sponsors", label: "Sponsoren" },
  ]},
  { title: "Finanzen", icon: "💶", items: [
    { href: "/admin/accounting/invoices", label: "Rechnungen" },
    { href: "/admin/accounting/ledger", label: "EAR / Buchungen" },
    { href: "/admin/accounting/accounts", label: "Konten" },
    { href: "/admin/payments", label: "Zahlungen" },
  ]},
  { title: "Kiosk", icon: "🥤", items: [
    { href: "/admin/kiosk/products", label: "Produkte" },
    { href: "/admin/kiosk/sales", label: "Verkäufe" },
    { href: "/admin/kiosk/register", label: "Kasse" },
  ]},
  { title: "System", icon: "⚙️", items: [
    { href: "/admin/devices", label: "Hardware" },
    { href: "/admin/notifications", label: "Benachrichtigungen" },
    { href: "/admin/settings", label: "Einstellungen" },
  ]},
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const tenant = await requireCurrentTenant();
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex">
      <aside className="w-72 bg-white border-r border-stone-200 sticky top-0 h-screen overflow-y-auto shrink-0 flex flex-col">
        <div className="px-5 py-5 border-b border-stone-200">
          <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Admin</div>
          <div className="font-semibold text-lg tracking-tight">{tenant.name}</div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 mt-1.5 transition-colors"
          >
            <span>←</span> Zur Vereinsseite
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {sections.map((sec) => (
            <div key={sec.title}>
              <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium mb-1.5 px-2 flex items-center gap-2">
                <span>{sec.icon}</span> {sec.title}
              </div>
              <ul className="space-y-0.5">
                {sec.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className="block px-2.5 py-1.5 rounded-lg text-sm text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8 max-w-6xl">{children}</main>
    </div>
  );
}
