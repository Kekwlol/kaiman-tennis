import { db } from "./db";
import type { BookingRule, Member } from "@prisma/client";

type Scope = {
  groups?: string[];
  courts?: string[];
  days?: number[]; // 0=So, 1=Mo, ...
  hourFrom?: number;
  hourTo?: number;
};

export type BookingValidationResult =
  | { ok: true }
  | { ok: false; reason: string; details?: Record<string, unknown> };

// Prüfe ob ein Mitglied eine Buchung machen darf
export async function validateBooking(input: {
  tenantId: string;
  member: Pick<Member, "id" | "group">;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<BookingValidationResult> {
  const rules = await db.bookingRule.findMany({
    where: { tenantId: input.tenantId, active: true },
  });

  const now = new Date();
  const durationMinutes = (input.endsAt.getTime() - input.startsAt.getTime()) / 60000;
  const advanceHours = (input.startsAt.getTime() - now.getTime()) / 3600000;
  const dayOfWeek = input.startsAt.getDay();
  const hour = input.startsAt.getHours();

  // Filter: nur Regeln die für diesen Member/Court/Slot gelten
  const applicable = rules.filter((r) => matchesScope(r, input, dayOfWeek, hour));

  for (const rule of applicable) {
    // Dauer-Check
    if (rule.minDurationMinutes && durationMinutes < rule.minDurationMinutes) {
      return { ok: false, reason: "DURATION_TOO_SHORT", details: { min: rule.minDurationMinutes } };
    }
    if (rule.maxDurationMinutes && durationMinutes > rule.maxDurationMinutes) {
      return { ok: false, reason: "DURATION_TOO_LONG", details: { max: rule.maxDurationMinutes } };
    }
    if (rule.minAdvanceHours != null && advanceHours < rule.minAdvanceHours) {
      return { ok: false, reason: "TOO_EARLY", details: { minAdvanceHours: rule.minAdvanceHours } };
    }
    if (rule.maxAdvanceDays != null && advanceHours / 24 > rule.maxAdvanceDays) {
      return { ok: false, reason: "TOO_LATE", details: { maxAdvanceDays: rule.maxAdvanceDays } };
    }

    // Quoten pro Woche/Tag
    if (rule.maxPerWeek) {
      const weekStart = new Date(input.startsAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = await db.booking.count({
        where: {
          memberId: input.member.id,
          tenantId: input.tenantId,
          status: "confirmed",
          startsAt: { gte: weekStart, lt: weekEnd },
        },
      });
      if (count >= rule.maxPerWeek) {
        return { ok: false, reason: "WEEKLY_LIMIT", details: { max: rule.maxPerWeek, used: count } };
      }
    }

    if (rule.maxOpenBookings) {
      const open = await db.booking.count({
        where: {
          memberId: input.member.id,
          tenantId: input.tenantId,
          status: "confirmed",
          startsAt: { gte: now },
        },
      });
      if (open >= rule.maxOpenBookings) {
        return { ok: false, reason: "TOO_MANY_OPEN", details: { max: rule.maxOpenBookings, open } };
      }
    }
  }

  return { ok: true };
}

function matchesScope(
  rule: BookingRule,
  input: { member: Pick<Member, "group">; courtId: string },
  dayOfWeek: number,
  hour: number,
): boolean {
  let scope: Scope;
  try {
    scope = JSON.parse(rule.scopeJson || "{}");
  } catch {
    return true; // bei kaputtem JSON: Regel gilt für alle
  }
  if (scope.groups?.length && !scope.groups.includes(input.member.group)) return false;
  if (scope.courts?.length && !scope.courts.includes(input.courtId)) return false;
  if (scope.days?.length && !scope.days.includes(dayOfWeek)) return false;
  if (scope.hourFrom != null && hour < scope.hourFrom) return false;
  if (scope.hourTo != null && hour >= scope.hourTo) return false;
  return true;
}

// Storno-Prüfung
export async function canCancel(input: {
  tenantId: string;
  bookingId: string;
}): Promise<BookingValidationResult> {
  const booking = await db.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) return { ok: false, reason: "NOT_FOUND" };
  if (booking.status !== "confirmed") return { ok: false, reason: "NOT_ACTIVE" };

  const rules = await db.bookingRule.findMany({
    where: { tenantId: input.tenantId, active: true },
  });
  const hoursLeft = (booking.startsAt.getTime() - Date.now()) / 3600000;
  for (const rule of rules) {
    if (rule.cancelDeadlineHours != null && hoursLeft < rule.cancelDeadlineHours) {
      return { ok: false, reason: "PAST_CANCEL_DEADLINE", details: { hoursLeft } };
    }
  }
  return { ok: true };
}
