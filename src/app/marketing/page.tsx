import Link from "next/link";

export default function Marketing() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-white text-stone-900">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
          Live-Demo · alle 13 Module verfügbar
        </div>
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6 leading-tight">
          Tennisverein-Software,<br />
          die <span className="text-green-600">einfach</span> ist.
        </h1>
        <p className="text-xl text-stone-600 max-w-2xl mb-10 leading-relaxed">
          Reservierung, Mitglieder, Turniere, Buchhaltung &mdash; alles aus
          einer Hand. Drei Wege wie du sie in deine Website bringst.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tenant/greinsfurth"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-700 transition-colors shadow-sm"
          >
            Demo ansehen
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/admin?_tenant=greinsfurth"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-stone-200 hover:border-stone-400 transition-colors shadow-sm"
          >
            Admin-Panel ansehen
          </Link>
        </div>
      </section>

      {/* Drei Strategien */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-6">
          Drei Wege deine Software einzubinden
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          <Card
            num="01"
            color="bg-amber-100 text-amber-800"
            title="Subdomain"
            body="dein-verein.kaiman.studio &mdash; komplette Vereinswebsite, von uns gehostet."
          />
          <Card
            num="02"
            color="bg-rose-100 text-rose-800"
            title="Custom Domain"
            body="tc-deinverein.at &mdash; eigene Domain mit automatischem SSL."
          />
          <Card
            num="03"
            color="bg-emerald-100 text-emerald-800"
            title="JS-Widget"
            body="Drei Zeilen Code in deine bestehende WordPress-Seite."
          />
        </div>
      </section>

      {/* Demo-Vereine */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold mb-2">Demo-Vereine</h2>
        <p className="text-stone-600 mb-8">
          In Production: <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm">greinsfurth.kaiman.studio</code>.
          Lokal nutzen wir Direct-Paths, weil der Browser <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm">lvh.me</code> nicht auflöst.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          <DemoCard
            accent="#EEFF00"
            title="TC Greinsfurth"
            subtitle="Strategie 1 &mdash; gelbes Branding"
            links={[
              ["Home", "/tenant/greinsfurth"],
              ["Reservierung", "/tenant/greinsfurth/reservierung"],
              ["Forderungspyramide", "/tenant/greinsfurth/forderung"],
              ["Turniere", "/tenant/greinsfurth/turniere"],
              ["Mannschaften", "/tenant/greinsfurth/mannschaften"],
              ["Kurse / Camps", "/tenant/greinsfurth/kurse"],
              ["News", "/tenant/greinsfurth/news"],
              ["Spielpartner", "/tenant/greinsfurth/spielpartner"],
            ]}
          />
          <DemoCard
            accent="#FF3366"
            title="Racketworld Wien"
            subtitle="Strategie 1 + 2 &mdash; rot, mit Custom Domain"
            links={[
              ["Home", "/tenant/racketworld"],
              ["Reservierung", "/tenant/racketworld/reservierung"],
            ]}
          />
        </div>
      </section>

      {/* Widget + Admin */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-5">
          <FeatureLink
            href="/widget-demo"
            tag="Strategie 3"
            title="Widget-Demo"
            body="Live eingebettet auf einer simulierten WordPress-Seite."
          />
          <FeatureLink
            href="/admin?_tenant=greinsfurth"
            tag="Backoffice"
            title="Admin-Panel"
            body="24 Module: Mitglieder, Buchungen, Pyramiden, Turniere, Buchhaltung, Kiosk &hellip;"
          />
        </div>
      </section>

      {/* Modul-Index */}
      <section className="max-w-6xl mx-auto px-6 py-16 mb-16">
        <h2 className="text-3xl font-semibold mb-2">Alle Admin-Module</h2>
        <p className="text-stone-600 mb-8">Direkt-Links mit aktivem Greinsfurth-Tenant</p>

        <div className="grid md:grid-cols-3 gap-x-10 gap-y-8">
          <Group title="Verein">
            <ALink href="/admin?_tenant=greinsfurth">Dashboard</ALink>
            <ALink href="/admin/members?_tenant=greinsfurth">Mitglieder</ALink>
            <ALink href="/admin/membership-types?_tenant=greinsfurth">Mitgliedschaftstypen</ALink>
          </Group>
          <Group title="Reservierung">
            <ALink href="/admin/courts?_tenant=greinsfurth">Plätze</ALink>
            <ALink href="/admin/bookings?_tenant=greinsfurth">Buchungen</ALink>
            <ALink href="/admin/rules?_tenant=greinsfurth">Buchungsregeln</ALink>
            <ALink href="/admin/prices?_tenant=greinsfurth">Preiszonen</ALink>
            <ALink href="/admin/subscriptions?_tenant=greinsfurth">Abos</ALink>
          </Group>
          <Group title="Vereinsleben">
            <ALink href="/admin/ladders?_tenant=greinsfurth">Forderungspyramiden</ALink>
            <ALink href="/admin/tournaments?_tenant=greinsfurth">Turniere</ALink>
            <ALink href="/admin/teams?_tenant=greinsfurth">Mannschaften</ALink>
            <ALink href="/admin/courses?_tenant=greinsfurth">Kurse / Camps</ALink>
            <ALink href="/admin/match-requests?_tenant=greinsfurth">Spielpartner</ALink>
          </Group>
          <Group title="CMS">
            <ALink href="/admin/cms/news?_tenant=greinsfurth">News</ALink>
            <ALink href="/admin/cms/pages?_tenant=greinsfurth">Seiten</ALink>
            <ALink href="/admin/cms/newsletter?_tenant=greinsfurth">Newsletter</ALink>
            <ALink href="/admin/cms/sponsors?_tenant=greinsfurth">Sponsoren</ALink>
          </Group>
          <Group title="Finanzen + Kiosk">
            <ALink href="/admin/accounting/invoices?_tenant=greinsfurth">Rechnungen</ALink>
            <ALink href="/admin/accounting/ledger?_tenant=greinsfurth">EAR / Buchungen</ALink>
            <ALink href="/admin/accounting/accounts?_tenant=greinsfurth">Konten</ALink>
            <ALink href="/admin/payments?_tenant=greinsfurth">Zahlungen</ALink>
            <ALink href="/admin/kiosk/products?_tenant=greinsfurth">Kiosk-Produkte</ALink>
            <ALink href="/admin/kiosk/sales?_tenant=greinsfurth">Verkäufe</ALink>
            <ALink href="/admin/kiosk/register?_tenant=greinsfurth">Kasse</ALink>
          </Group>
          <Group title="System">
            <ALink href="/admin/devices?_tenant=greinsfurth">Hardware</ALink>
            <ALink href="/admin/notifications?_tenant=greinsfurth">Benachrichtigungen</ALink>
            <ALink href="/admin/settings?_tenant=greinsfurth">Einstellungen</ALink>
          </Group>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-stone-500 flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-stone-900">Kaiman Tennis</strong> &middot; gebaut von <a className="hover:underline" href="https://kaiman.studio">kaiman.studio</a>
          </div>
          <div>Wien Doebling &middot; Next.js + Prisma + SQLite</div>
        </div>
      </footer>
    </main>
  );
}

function Card({ num, color, title, body }: { num: string; color: string; title: string; body: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-stone-300 hover:shadow-md transition-all">
      <div className={`inline-block text-xs font-mono font-medium ${color} px-2 py-1 rounded-md mb-4`}>{num}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-stone-600 leading-relaxed">{body}</p>
    </div>
  );
}

function DemoCard({
  accent, title, subtitle, links,
}: {
  accent: string; title: string; subtitle: string; links: [string, string][];
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-1">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ background: accent, boxShadow: `0 0 0 4px ${accent}33` }}
        />
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-stone-500 mb-5">{subtitle}</p>
      <ul className="space-y-1.5 text-sm">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex items-center gap-2 text-stone-700 hover:text-stone-900 group"
            >
              <span className="text-stone-300 group-hover:text-stone-900 transition-colors">→</span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureLink({
  href, tag, title, body,
}: { href: string; tag: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-green-400 hover:bg-green-50/50 transition-all group block"
    >
      <div className="text-xs font-medium text-green-700 mb-2 uppercase tracking-wider">{tag}</div>
      <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
        {title}
        <span className="text-stone-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all">→</span>
      </h3>
      <p className="text-sm text-stone-600">{body}</p>
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">{title}</h3>
      <ul className="space-y-1.5 text-sm">{children}</ul>
    </div>
  );
}

function ALink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-stone-700 hover:text-green-700 transition-colors inline-flex items-center gap-2 group">
        <span className="text-stone-300 group-hover:text-green-600">→</span>
        {children}
      </Link>
    </li>
  );
}
