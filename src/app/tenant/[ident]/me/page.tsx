import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fmtLevel } from "@/lib/skill";
import { fmtMoney } from "@/lib/money";
import { MemberSwitcher } from "./switcher";
import { getAuth } from "@/lib/auth";
import { generateIcalToken } from "@/lib/auth";

const ALLOW_DEMO_SWITCH =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_TENANT_OVERRIDE === "1";

export default async function MyArea({
  params,
  searchParams,
}: {
  params: Promise<{ ident: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { ident } = await params;
  const { as } = await searchParams;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      members: { where: { status: "active" }, orderBy: { name: "asc" } },
    },
  });
  if (!tenant) notFound();

  // Auth: in Production muss ein eingeloggter Member da sein
  const auth = await getAuth();
  let member = auth?.memberId
    ? tenant.members.find((m) => m.id === auth.memberId)
    : null;

  // Demo-Override (nur wenn explizit erlaubt)
  if (!member && ALLOW_DEMO_SWITCH) {
    member = as
      ? tenant.members.find((m) => m.id === as) ?? tenant.members[0]
      : tenant.members[0];
  }

  if (!member) {
    // In Production ohne Auth: Login-Page
    return (
      <div className="max-w-md mx-auto bg-white border border-stone-200 rounded-2xl p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold mb-3">Anmeldung erforderlich</h1>
        <p className="text-stone-600 mb-6">
          Du musst eingeloggt sein um dein Profil zu sehen.
        </p>
        <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 text-white font-medium">
          Login &rarr;
        </Link>
      </div>
    );
  }

  const [bookings, openSessions, ladderEntries, teamMemberships, courseRegs, payments, wallet] = await Promise.all([
    db.booking.findMany({
      where: { memberId: member.id, status: "confirmed", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { court: true },
    }),
    db.openSession.findMany({
      where: {
        OR: [{ hostId: member.id }, { participants: { some: { memberId: member.id } } }],
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: "asc" },
      take: 3,
      include: { court: true },
    }),
    db.ladderParticipant.findMany({
      where: { memberId: member.id, ladder: { active: true } },
      include: { ladder: true },
    }),
    db.teamMember.findMany({
      where: { memberId: member.id, team: { active: true } },
      include: { team: { include: { matches: { where: { date: { gte: new Date() } }, orderBy: { date: "asc" }, take: 2 } } } },
    }),
    db.courseRegistration.findMany({
      where: { memberId: member.id, course: { status: "published" } },
      include: { course: true },
    }),
    db.payment.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.wallet.findUnique({ where: { memberId: member.id } }),
  ]);

  const lvl = fmtLevel(member.skillScore);
  const totalBookings = await db.booking.count({ where: { memberId: member.id, status: "confirmed" } });
  const wonChallenges = await db.challenge.count({ where: { winnerId: member.id } });

  return (
    <div className="space-y-8">
      {/* Member-Switcher nur im Dev/Demo-Mode */}
      {ALLOW_DEMO_SWITCH && !auth && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-900 flex items-center gap-3 flex-wrap">
          <span>🎭 Demo:</span>
          <span>Du siehst <strong>{member.name}</strong> als Beispiel.</span>
          <span>Wechseln:</span>
          <MemberSwitcher
            members={tenant.members.map((m) => ({ id: m.id, name: m.name }))}
            currentId={member.id}
          />
        </div>
      )}

      {/* Profil-Hero */}
      <section className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-start gap-6 flex-wrap">
          <span
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold"
            style={{ background: `${tenant.primaryColor}33`, color: "#1c1917" }}
          >
            {member.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">{member.name}</h1>
            <p className="text-stone-500 mb-3">{member.email}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ background: tenant.primaryColor, color: "#1c1917" }}
              >
                Level {lvl.level.toFixed(1)} · {lvl.label}
              </span>
              <span className="text-sm tabular-nums" title="Skill-Score">{lvl.stars}</span>
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium capitalize">
                {member.group}
              </span>
            </div>
          </div>

          <a
            href={`/api/ical/me?token=${generateIcalToken(member.id)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 text-sm hover:bg-stone-50 transition-colors"
          >
            📅 Kalender abonnieren
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-stone-100">
          <Stat label="Buchungen" value={totalBookings.toString()} />
          <Stat label="Match-Siege" value={wonChallenges.toString()} />
          <Stat label="Ranglisten" value={ladderEntries.length.toString()} />
          <Stat label="Wallet" value={fmtMoney(wallet?.balance ?? 0)} hint="Spielguthaben" />
        </div>
      </section>

      {/* Naechste Aktivitaeten */}
      <section className="grid md:grid-cols-2 gap-5">
        <Card title="🎾 Meine Buchungen" link={["/reservierung", "Neue Buchung"]}>
          {bookings.length === 0 && <Empty>Keine kommenden Buchungen.</Empty>}
          {bookings.map((b) => (
            <Row key={b.id}
              title={b.court.name}
              meta={b.startsAt.toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              right={b.pinCode ? `PIN ${b.pinCode}` : undefined}
            />
          ))}
        </Card>

        <Card title="👥 Open Play" link={["/sessions", "Sessions"]}>
          {openSessions.length === 0 && <Empty>Keine offenen Sessions.</Empty>}
          {openSessions.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`} className="block">
              <Row
                title={s.format === "doubles" ? "Doppel" : s.format === "singles" ? "Einzel" : s.format}
                meta={s.startsAt.toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                right={s.hostId === member.id ? "Host" : "Teilnehmer"}
              />
            </Link>
          ))}
        </Card>

        <Card title="📈 Forderungen" link={["/forderung", "Alle"]}>
          {ladderEntries.length === 0 && <Empty>Nicht in einer Rangliste.</Empty>}
          {ladderEntries.map((e) => (
            <Row key={e.id}
              title={e.ladder.name}
              meta={`Position ${e.position} · ${e.matchesWon}/${e.matchesPlayed} Matches`}
              right={e.ladder.format === "points" ? `${e.points} Pkt` : undefined}
            />
          ))}
        </Card>

        <Card title="🏆 Mannschaften" link={["/mannschaften", "Alle"]}>
          {teamMemberships.length === 0 && <Empty>Nicht in einer Mannschaft.</Empty>}
          {teamMemberships.map((tm) => (
            <div key={tm.id}>
              <Row title={tm.team.name} meta={tm.team.league ?? "—"} />
              {tm.team.matches.map((m) => (
                <div key={m.id} className="ml-3 mt-1 text-xs text-stone-500">
                  → {m.date.toLocaleDateString("de-AT")} {m.isHome ? "vs" : "@"} {m.opponent}
                </div>
              ))}
            </div>
          ))}
        </Card>

        <Card title="🎓 Kurse" link={["/kurse", "Alle"]}>
          {courseRegs.length === 0 && <Empty>Keine Anmeldungen.</Empty>}
          {courseRegs.map((cr) => (
            <Row key={cr.id}
              title={cr.course.name}
              meta={cr.course.startsAt.toLocaleDateString("de-AT")}
              right={cr.paid ? "✓ bezahlt" : "offen"}
            />
          ))}
        </Card>

        <Card title="💶 Letzte Zahlungen">
          {payments.length === 0 && <Empty>Keine Zahlungen.</Empty>}
          {payments.map((p) => (
            <Row key={p.id}
              title={p.provider}
              meta={p.createdAt.toLocaleDateString("de-AT")}
              right={fmtMoney(p.amount)}
            />
          ))}
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-stone-500 uppercase tracking-wider font-medium">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-stone-400">{hint}</div>}
    </div>
  );
}

function Card({
  title,
  link,
  children,
}: {
  title: string;
  link?: [string, string];
  children: React.ReactNode;
}) {
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {link && (
          <Link href={link[0]} className="text-xs text-stone-500 hover:text-stone-900">
            {link[1]} →
          </Link>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </article>
  );
}

function Row({ title, meta, right }: { title: string; meta?: string; right?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1">
      <div className="min-w-0">
        <div className="font-medium truncate">{title}</div>
        {meta && <div className="text-xs text-stone-500">{meta}</div>}
      </div>
      {right && <span className="text-xs text-stone-600 shrink-0 tabular-nums">{right}</span>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-stone-400 italic py-2">{children}</p>;
}
