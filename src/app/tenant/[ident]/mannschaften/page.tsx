import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PublicTeams({ params }: { params: Promise<{ ident: string }> }) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      teams: {
        where: { active: true },
        include: {
          members: { include: { member: true }, orderBy: { position: "asc" } },
          matches: { orderBy: { date: "asc" }, take: 5 },
        },
      },
    },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Mannschaften</h1>
        <p className="text-stone-500 mt-2">{tenant.teams.length} aktive Mannschaften</p>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        {tenant.teams.map((t) => (
          <article key={t.id} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold">{t.name}</h2>
            {(t.league || t.division) && (
              <p className="text-xs text-stone-500 mt-1">
                {t.league} {t.division}
              </p>
            )}

            <div className="mt-5">
              <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Spieler</h3>
              <ol className="text-sm space-y-1">
                {t.members.map((tm, i) => (
                  <li key={tm.id} className="flex items-center gap-3 py-1">
                    <span className="text-stone-400 tabular-nums w-5">{i + 1}.</span>
                    <span>{tm.member.name}</span>
                  </li>
                ))}
                {t.members.length === 0 && (
                  <li className="text-stone-400 italic text-xs">Noch keine Aufstellung</li>
                )}
              </ol>
            </div>

            <div className="mt-5">
              <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Nächste Spiele</h3>
              <ul className="text-sm space-y-1.5">
                {t.matches.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        m.isHome ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {m.isHome ? "Heim" : "Auswaerts"}
                    </span>
                    <span className="text-stone-500 tabular-nums">
                      {m.date.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <span>vs {m.opponent}</span>
                  </li>
                ))}
                {t.matches.length === 0 && (
                  <li className="text-stone-400 italic text-xs">Keine Spiele angesetzt</li>
                )}
              </ul>
            </div>
          </article>
        ))}
        {tenant.teams.length === 0 && (
          <p className="text-stone-500 italic col-span-2">Keine Mannschaften.</p>
        )}
      </div>
    </div>
  );
}
