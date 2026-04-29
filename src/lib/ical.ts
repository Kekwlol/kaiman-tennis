// iCal (RFC 5545) Generator fuer Buchungen, Mannschaftsspiele, Open-Sessions
import { db } from "./db";

function fmtDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

type IcalEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
};

export function buildIcal(calendarName: string, events: IcalEvent[]): string {
  const now = fmtDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kaiman Tennis//Calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "X-WR-TIMEZONE:Europe/Vienna",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@kaiman.studio`,
      `DTSTAMP:${now}`,
      `DTSTART:${fmtDate(e.start)}`,
      `DTEND:${fmtDate(e.end)}`,
      `SUMMARY:${escapeText(e.summary)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// Personal-Calendar fuer ein Mitglied: eigene Buchungen + Mannschaftsspiele + Open-Sessions
export async function buildMemberCalendar(memberId: string): Promise<string> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { tenant: true },
  });
  if (!member) return buildIcal("Kaiman Tennis", []);

  const [bookings, teamMatches, openSessions] = await Promise.all([
    db.booking.findMany({
      where: { memberId, status: "confirmed", startsAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
      include: { court: true },
    }),
    db.leagueMatch.findMany({
      where: {
        team: { members: { some: { memberId } } },
        date: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
      },
      include: { team: true, court: true },
    }),
    db.openSession.findMany({
      where: {
        OR: [{ hostId: memberId }, { participants: { some: { memberId } } }],
        status: { in: ["open", "full"] },
        startsAt: { gte: new Date() },
      },
      include: { court: true },
    }),
  ]);

  const events: IcalEvent[] = [];

  for (const b of bookings) {
    events.push({
      uid: `booking-${b.id}`,
      start: b.startsAt,
      end: b.endsAt,
      summary: `🎾 Reservierung ${b.court.name}`,
      description: b.pinCode ? `Zutritts-PIN: ${b.pinCode}` : undefined,
      location: `${member.tenant.name} - ${b.court.name}`,
    });
  }

  for (const m of teamMatches) {
    events.push({
      uid: `match-${m.id}`,
      start: m.date,
      end: new Date(m.date.getTime() + 4 * 3600 * 1000),
      summary: `🏆 ${m.team.name} ${m.isHome ? "vs" : "@"} ${m.opponent}`,
      location: m.isHome ? member.tenant.name : m.opponent,
    });
  }

  for (const s of openSessions) {
    events.push({
      uid: `session-${s.id}`,
      start: s.startsAt,
      end: s.endsAt,
      summary: `👥 Open Play (${s.format})`,
      description: s.description ?? undefined,
      location: s.court ? `${member.tenant.name} - ${s.court.name}` : member.tenant.name,
    });
  }

  return buildIcal(`${member.tenant.name} - ${member.name}`, events);
}
