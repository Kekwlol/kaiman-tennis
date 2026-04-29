import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { fmtLevel } from "@/lib/skill";

export default async function PublicLadders({ params }: { params: Promise<{ ident: string }> }) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      ladders: {
        where: { active: true },
        include: {
          participants: { include: { member: true }, orderBy: [{ position: "asc" }, { points: "desc" }] },
          _count: { select: { challenges: { where: { status: { in: ["pending", "accepted"] } } } } },
        },
      },
    },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Forderungen &amp; Ranglisten</h1>
        <p className="text-stone-500 mt-2">{tenant.ladders.length} aktive Bewerbe</p>
      </header>

      {tenant.ladders.map((l) => (
        <section key={l.id} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
            <h2 className="text-2xl font-semibold">{l.name}</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-medium uppercase tracking-wider">
                {l.format}
              </span>
              <span className="text-stone-500">{l._count.challenges} offene Forderungen</span>
            </div>
          </div>
          <ol className="space-y-1">
            {l.participants.slice(0, 10).map((p, idx) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums"
                    style={{
                      background: idx === 0 ? tenant.primaryColor : "#f5f5f4",
                      color: idx === 0 ? pickContrast(tenant.primaryColor) : "#57534e",
                    }}
                  >
                    {p.position}
                  </span>
                  <span className="font-medium">{p.member.name}</span>
                  {idx === 0 && <span className="text-xs">👑</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-500 tabular-nums">
                  {l.format === "points" ? (
                    <span><strong className="text-stone-900">{p.points}</strong> Pkt</span>
                  ) : (
                    (() => {
                      const lvl = fmtLevel(p.member.skillScore);
                      return (
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 font-medium" title={`Skill-Score ${p.member.skillScore}`}>
                          Lv {lvl.level.toFixed(1)} · {lvl.label}
                        </span>
                      );
                    })()
                  )}
                  <span>{p.matchesWon}/{p.matchesPlayed}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {tenant.ladders.length === 0 && (
        <p className="text-stone-500 italic">Keine aktiven Bewerbe.</p>
      )}
    </div>
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
