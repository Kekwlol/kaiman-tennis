import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { fmtLevel } from "@/lib/skill";
import { getTenantBasePath } from "@/lib/tenant-context";

export default async function SessionDetail({
  params,
}: {
  params: Promise<{ ident: string; sessionId: string }>;
}) {
  const { ident, sessionId } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      members: { where: { status: "active" }, orderBy: { name: "asc" } },
    },
  });
  if (!tenant) notFound();
  const tenantId = tenant.id;

  const session = await db.openSession.findFirst({
    where: { id: sessionId, tenantId: tenantId },
    include: {
      host: true,
      court: true,
      participants: { include: { member: true } },
    },
  });
  if (!session) notFound();
  const base = await getTenantBasePath(tenant.slug);

  async function joinSession(formData: FormData) {
    "use server";
    const memberId = String(formData.get("memberId"));
    if (!memberId || !session) return;

    // Tenant-Match: Member muss zum gleichen Tenant gehoeren
    const member = await db.member.findFirst({
      where: { id: memberId, tenantId: tenantId },
    });
    if (!member) throw new Error("MEMBER_NOT_FOUND_OR_FORBIDDEN");

    // Race-Condition-sicher mit Transaction
    await db.$transaction(async (tx) => {
      const fresh = await tx.openSession.findUnique({
        where: { id: session.id },
        include: { participants: true },
      });
      if (!fresh) throw new Error("SESSION_GONE");
      const filled = fresh.participants.length + 1; // +host
      if (filled >= fresh.maxPlayers) throw new Error("SESSION_FULL");
      if (memberId === fresh.hostId) throw new Error("HOST_CANNOT_JOIN");
      const exists = fresh.participants.find((p) => p.memberId === memberId);
      if (exists) return;
      await tx.openSessionParticipant.create({ data: { sessionId: fresh.id, memberId } });
      if (filled + 1 >= fresh.maxPlayers) {
        await tx.openSession.update({ where: { id: fresh.id }, data: { status: "full" } });
      }
    });
    redirect(`${base}/sessions/${session.id}`);
  }

  async function leaveSession(formData: FormData) {
    "use server";
    const memberId = String(formData.get("memberId"));
    if (!memberId || !session) return;
    // Tenant-Match
    const member = await db.member.findFirst({
      where: { id: memberId, tenantId: tenantId },
    });
    if (!member) throw new Error("MEMBER_NOT_FOUND_OR_FORBIDDEN");
    await db.openSessionParticipant.deleteMany({
      where: { sessionId: session.id, memberId },
    });
    await db.openSession.update({
      where: { id: session.id },
      data: { status: "open" },
    });
    redirect(`${base}/sessions/${session.id}`);
  }

  const filled = session.participants.length + 1;
  const isFull = filled >= session.maxPlayers;
  const minLvl = fmtLevel(session.skillMin * 200 + 600);
  const maxLvl = fmtLevel(session.skillMax * 200 + 600);
  const formatLabel = { singles: "Einzel", doubles: "Doppel", mixed: "Mixed", practice: "Training" }[session.format] ?? session.format;
  const joinedIds = new Set([session.hostId, ...session.participants.map((p) => p.memberId)]);
  const eligibleToJoin = tenant.members.filter((m) => !joinedIds.has(m.id));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={`${base}/sessions`} className="text-sm text-stone-500 hover:text-stone-900">
        ← Alle Sessions
      </Link>

      <article className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-baseline justify-between gap-2 mb-4 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            {formatLabel}
          </span>
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={
              isFull
                ? { background: "#fee2e2", color: "#991b1b" }
                : { background: "#d1fae5", color: "#065f46" }
            }
          >
            {filled}/{session.maxPlayers} Spieler
          </span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight mb-1">
          Open Play am{" "}
          {session.startsAt.toLocaleString("de-AT", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </h1>
        <p className="text-stone-500 mb-6">
          {session.startsAt.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} —{" "}
          {session.endsAt.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}
          {session.court && ` · ${session.court.name}`}
        </p>

        <div className="bg-stone-50 rounded-xl p-4 mb-6">
          <div className="text-xs text-stone-500 uppercase tracking-wider mb-1.5 font-medium">Skill-Level</div>
          <div className="text-lg font-semibold">
            {minLvl.level.toFixed(1)} – {maxLvl.level.toFixed(1)}
          </div>
          <div className="text-xs text-stone-500">{minLvl.label} bis {maxLvl.label}</div>
        </div>

        {session.description && (
          <p className="text-stone-700 mb-6 italic">{session.description}</p>
        )}

        <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">Teilnehmer</h2>
        <ul className="space-y-2 mb-6">
          <Player member={session.host} isHost accent={tenant.primaryColor} />
          {session.participants.map((p) => (
            <Player key={p.id} member={p.member} accent={tenant.primaryColor} onLeaveAction={leaveSession} />
          ))}
        </ul>

        {!isFull && (
          <form action={joinSession} className="border-t border-stone-200 pt-5 flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Als wer beitreten?</label>
              <select
                name="memberId"
                required
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-stone-900 outline-none"
              >
                {eligibleToJoin.map((m) => {
                  const lvl = fmtLevel(m.skillScore);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} (Level {lvl.level.toFixed(1)})
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-700 transition-colors"
            >
              Beitreten
            </button>
          </form>
        )}
      </article>
    </div>
  );
}

function Player({
  member,
  isHost,
  accent,
  onLeaveAction,
}: {
  member: { id: string; name: string; skillScore: number };
  isHost?: boolean;
  accent: string;
  onLeaveAction?: (fd: FormData) => Promise<void>;
}) {
  const lvl = fmtLevel(member.skillScore);
  return (
    <li className="flex items-center justify-between gap-3 bg-stone-50 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
          style={{ background: `${accent}33` }}
        >
          {member.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
        </span>
        <div>
          <div className="font-medium flex items-center gap-2">
            {member.name}
            {isHost && <span className="text-xs">👑</span>}
          </div>
          <div className="text-xs text-stone-500">Level {lvl.level.toFixed(1)} · {lvl.label}</div>
        </div>
      </div>
      {onLeaveAction && (
        <form action={onLeaveAction}>
          <input type="hidden" name="memberId" value={member.id} />
          <button className="text-xs text-stone-500 hover:text-red-600">Verlassen</button>
        </form>
      )}
    </li>
  );
}
