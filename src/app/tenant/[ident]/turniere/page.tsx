import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { fmtMoney } from "@/lib/money";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Entwurf", color: "bg-stone-100 text-stone-700" },
  registration: { label: "Anmeldung offen", color: "bg-green-100 text-green-800" },
  seeded: { label: "Gesetzt", color: "bg-blue-100 text-blue-800" },
  running: { label: "Laeuft", color: "bg-amber-100 text-amber-800" },
  finished: { label: "Beendet", color: "bg-stone-100 text-stone-500" },
};

export default async function PublicTournaments({
  params,
}: {
  params: Promise<{ ident: string }>;
}) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      tournaments: {
        orderBy: { startsAt: "desc" },
        include: { _count: { select: { entries: true } } },
      },
    },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Turniere</h1>
        <p className="text-stone-500 mt-2">{tenant.tournaments.length} Turniere insgesamt</p>
      </header>

      <ul className="space-y-3">
        {tenant.tournaments.map((t) => {
          const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.draft;
          return (
            <li
              key={t.id}
              className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h2 className="text-xl font-semibold">{t.name}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-stone-500 mt-2">
                {t.format} &middot; {t.matchType} &middot;{" "}
                {t.startsAt.toLocaleDateString("de-AT", { day: "2-digit", month: "long" })} bis{" "}
                {t.endsAt.toLocaleDateString("de-AT", { day: "2-digit", month: "long" })}
              </p>
              <div className="flex items-center gap-5 mt-4 text-xs text-stone-600">
                <span>
                  <strong className="text-stone-900 tabular-nums">{t._count.entries}</strong>/{t.drawSize}{" "}
                  Anmeldungen
                </span>
                <span>
                  Gebühr: <strong className="text-stone-900">{fmtMoney(t.entryFee)}</strong>
                </span>
              </div>
            </li>
          );
        })}
        {tenant.tournaments.length === 0 && (
          <li className="text-stone-500 italic">Keine Turniere.</li>
        )}
      </ul>
    </div>
  );
}
