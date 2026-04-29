import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenantBasePath } from "@/lib/tenant-context";

export default async function TenantHome({
  params,
}: {
  params: Promise<{ ident: string }>;
}) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      courts: { where: { active: true } },
      _count: { select: { members: true } },
      newsItems: { orderBy: { publishedAt: "desc" }, take: 3 },
      tournaments: { where: { status: { in: ["registration", "running"] } }, take: 3 },
      ladders: { where: { active: true }, take: 3, include: { _count: { select: { participants: true } } } },
    },
  });
  if (!tenant) notFound();
  const base = await getTenantBasePath(tenant.slug);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="bg-white border border-stone-200 rounded-2xl p-8 md:p-12 shadow-sm">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Willkommen bei
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
          {tenant.name}
        </h1>
        <p className="text-stone-600 mb-8">
          {tenant.courts.length} Plätze &middot; {tenant._count.members} Mitglieder
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${base}/reservierung`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium shadow-sm hover:shadow-md transition-all"
            style={{ background: tenant.primaryColor, color: pickContrast(tenant.primaryColor) }}
          >
            Platz reservieren <span aria-hidden>→</span>
          </Link>
          <Link
            href={`${base}/mitgliedschaft`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium border border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50 transition-all"
          >
            Mitglied werden
          </Link>
        </div>
      </section>

      {/* Quick-Links */}
      <section className="grid md:grid-cols-3 gap-4">
        <QuickCard href={`${base}/turniere`} emoji="🏆" title="Turniere" count={tenant.tournaments.length} />
        <QuickCard href={`${base}/forderung`} emoji="📈" title="Forderungen" count={tenant.ladders.reduce((s, l) => s + l._count.participants, 0)} />
        <QuickCard href={`${base}/kurse`} emoji="🎾" title="Kurse / Camps" />
      </section>

      {/* News */}
      {tenant.newsItems.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-semibold">Aktuelles</h2>
            <Link href={`${base}/news`} className="text-sm text-stone-500 hover:text-stone-900">
              Alle News →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {tenant.newsItems.map((n) => (
              <article key={n.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <time className="text-xs text-stone-500">
                  {n.publishedAt.toLocaleDateString("de-AT", { day: "2-digit", month: "long" })}
                </time>
                <h3 className="font-semibold mt-2 mb-2">{n.title}</h3>
                <p className="text-sm text-stone-600 line-clamp-3">{n.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QuickCard({ href, emoji, title, count }: { href: string; emoji: string; title: string; count?: number }) {
  return (
    <Link
      href={href}
      className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-stone-300 transition-all flex items-center justify-between group"
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl">{emoji}</span>
        <div>
          <div className="font-semibold">{title}</div>
          {count !== undefined && (
            <div className="text-xs text-stone-500">{count} aktiv</div>
          )}
        </div>
      </div>
      <span className="text-stone-300 group-hover:text-stone-900 group-hover:translate-x-1 transition-all">→</span>
    </Link>
  );
}

function pickContrast(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "#000";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#000" : "#fff";
}
