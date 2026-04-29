import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fmtLevel } from "@/lib/skill";
import { getTenantBasePath } from "@/lib/tenant-context";

export default async function OpenSessions({ params }: { params: Promise<{ ident: string }> }) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      openSessions: {
        where: { status: { in: ["open", "full"] }, startsAt: { gte: new Date() } },
        include: {
          host: true,
          court: true,
          participants: { include: { member: true } },
        },
        orderBy: { startsAt: "asc" },
      },
    },
  });
  if (!tenant) notFound();
  const base = await getTenantBasePath(tenant.slug);

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Open Play</h1>
          <p className="text-stone-500 mt-2">
            Spontan einsteigen oder eigene Session starten — passend zu deinem Skill-Level
          </p>
        </div>
        <Link
          href={`${base}/sessions/new`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium shadow-sm hover:shadow-md transition-all"
          style={{ background: tenant.primaryColor, color: pickContrast(tenant.primaryColor) }}
        >
          + Session starten
        </Link>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {tenant.openSessions.map((s) => {
          const minLvl = fmtLevel(s.skillMin * 200 + 600);
          const maxLvl = fmtLevel(s.skillMax * 200 + 600);
          const filled = s.participants.length + 1; // +1 host
          const isFull = filled >= s.maxPlayers;
          const formatLabel = { singles: "Einzel", doubles: "Doppel", mixed: "Mixed", practice: "Training" }[s.format] ?? s.format;
          return (
            <article key={s.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  {formatLabel}
                </span>
                {isFull ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Voll</span>
                ) : (
                  <span className="text-xs text-emerald-700 font-medium">
                    {filled}/{s.maxPlayers} Spieler
                  </span>
                )}
              </div>
              <div className="text-lg font-semibold mb-1">
                {s.startsAt.toLocaleString("de-AT", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-sm text-stone-500 mb-3">
                {s.court?.name ?? "Platz wird zugewiesen"} · gehostet von {s.host.name}
              </div>

              <div className="flex items-center gap-2 mb-4 text-xs">
                <span className="text-stone-500">Level:</span>
                <span className="px-2 py-0.5 bg-stone-100 rounded-full font-medium">
                  {minLvl.level.toFixed(1)} – {maxLvl.level.toFixed(1)}
                </span>
                <span className="text-stone-400">{minLvl.label} – {maxLvl.label}</span>
              </div>

              {s.description && <p className="text-sm text-stone-600 mb-4">{s.description}</p>}

              <div className="flex -space-x-2 mb-4">
                <Avatar name={s.host.name} accent={tenant.primaryColor} crown />
                {s.participants.map((p) => (
                  <Avatar key={p.id} name={p.member.name} accent={tenant.primaryColor} />
                ))}
                {Array.from({ length: Math.max(0, s.maxPlayers - filled) }).map((_, i) => (
                  <span
                    key={i}
                    className="w-9 h-9 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-stone-400 text-xs"
                  >
                    +
                  </span>
                ))}
              </div>

              <Link
                href={`${base}/sessions/${s.id}`}
                className={`inline-flex items-center justify-center w-full px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  isFull
                    ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                    : "bg-stone-900 text-white hover:bg-stone-700 shadow-sm"
                }`}
              >
                {isFull ? "Voll" : "Beitreten →"}
              </Link>
            </article>
          );
        })}
        {tenant.openSessions.length === 0 && (
          <div className="md:col-span-2 bg-white border border-dashed border-stone-300 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🎾</div>
            <p className="text-stone-600 mb-4">Noch keine offenen Sessions.</p>
            <Link
              href={`${base}/sessions/new`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 text-white font-medium"
            >
              Erste Session starten →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ name, accent, crown }: { name: string; accent: string; crown?: boolean }) {
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold relative"
      style={{ background: `${accent}33`, color: pickContrast(accent) === "#000" ? "#1c1917" : "#fafaf9" }}
      title={name + (crown ? " (Host)" : "")}
    >
      {initials}
      {crown && <span className="absolute -top-1.5 -right-1 text-[10px]">👑</span>}
    </span>
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
