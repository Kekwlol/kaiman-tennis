import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { fmtMoney } from "@/lib/money";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  course: { label: "Kurs", color: "bg-blue-100 text-blue-800" },
  camp: { label: "Camp", color: "bg-amber-100 text-amber-800" },
  event: { label: "Event", color: "bg-purple-100 text-purple-800" },
};

export default async function PublicCourses({ params }: { params: Promise<{ ident: string }> }) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      courses: {
        where: { status: "published" },
        orderBy: { startsAt: "asc" },
        include: { _count: { select: { registrations: true } } },
      },
    },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Kurse, Camps &amp; Events</h1>
        <p className="text-stone-500 mt-2">Trainingsangebote und Veranstaltungen</p>
      </header>

      <ul className="grid md:grid-cols-2 gap-5">
        {tenant.courses.map((c) => {
          const type = TYPE_LABELS[c.type] ?? TYPE_LABELS.course;
          const isFull = c._count.registrations >= c.capacity;
          return (
            <li key={c.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${type.color}`}>
                    {type.label}
                  </span>
                  {isFull && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                      Ausgebucht
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold mb-2">{c.name}</h2>
                <p className="text-sm text-stone-500 mb-4">
                  {c.startsAt.toLocaleString("de-AT", { weekday: "short", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
                </p>
                {c.description && <p className="text-sm text-stone-700 mb-4">{c.description}</p>}
              </div>
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold tabular-nums" style={{ color: tenant.primaryColor }}>
                    {fmtMoney(c.price)}
                  </div>
                  <div className="text-xs text-stone-500 tabular-nums">
                    {c._count.registrations}/{c.capacity} Teilnehmer
                  </div>
                </div>
                <button
                  disabled={isFull}
                  className="px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: tenant.primaryColor, color: pickContrast(tenant.primaryColor) }}
                >
                  Anmelden
                </button>
              </div>
            </li>
          );
        })}
        {tenant.courses.length === 0 && (
          <li className="text-stone-500 italic col-span-2">Keine Veranstaltungen.</li>
        )}
      </ul>
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
