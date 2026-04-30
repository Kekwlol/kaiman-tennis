import { db } from "./db";
import { validateBooking } from "./booking-rules";
import { loadZones, priceFromZones } from "./pricing";
import { notify } from "./notifications";
import { executeDevice } from "./devices";
import { fetchHourlyForecast, weatherEmoji } from "./weather";
import { randomInt } from "node:crypto";

export type Slot = {
  courtId: string;
  courtName: string;
  courtCategory: string;
  start: Date;
  end: Date;
  available: boolean;
  priceCents: number;
  weather?: { emoji: string; tempC: number; precipMm: number };
};

const OPEN_HOUR = 8;
const CLOSE_HOUR = 22;

export async function getAvailability(
  tenantId: string,
  date: Date,
  memberGroup = "guest",
): Promise<Slot[]> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [courts, bookings, zones] = await Promise.all([
    db.court.findMany({ where: { tenantId, active: true }, orderBy: { order: "asc" } }),
    db.booking.findMany({
      where: { tenantId, startsAt: { gte: dayStart, lt: dayEnd }, status: "confirmed" },
    }),
    loadZones(tenantId),
  ]);

  const hasOutdoor = courts.some((c) => c.category === "outdoor" || c.category === "allweather");
  const isFuture = dayEnd.getTime() > Date.now();
  let weatherSlots: Awaited<ReturnType<typeof fetchHourlyForecast>> = [];
  if (hasOutdoor && isFuture) {
    weatherSlots = await fetchHourlyForecast(48.21, 16.36, dayStart);
  }

  const slots: Slot[] = [];
  for (const court of courts) {
    const isOutdoor = court.category === "outdoor" || court.category === "allweather";
    for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
      const start = new Date(dayStart);
      start.setHours(h, 0, 0, 0);
      const end = new Date(start);
      end.setHours(h + 1);
      const taken = bookings.some(
        (b) =>
          b.courtId === court.id &&
          b.startsAt.getTime() < end.getTime() &&
          b.endsAt.getTime() > start.getTime(),
      );
      const priceCents = priceFromZones(zones, {
        courtId: court.id,
        startsAt: start,
        memberGroup,
      });

      let weather: Slot["weather"];
      if (isOutdoor && weatherSlots.length) {
        const w = weatherSlots.find((ws) => new Date(ws.iso).getHours() === h);
        if (w) weather = { emoji: weatherEmoji(w.code, w.precipMm), tempC: w.tempC, precipMm: w.precipMm };
      }

      slots.push({
        courtId: court.id,
        courtName: court.name,
        courtCategory: court.category,
        start,
        end,
        available: !taken,
        priceCents,
        weather,
      });
    }
  }
  return slots;
}

// Sicherer 6-stelliger PIN via crypto.randomInt (statt Math.random)
function generatePin(): string {
  return randomInt(100000, 1_000_000).toString();
}

export async function createBooking(input: {
  tenantId: string;
  courtId: string;
  memberId?: string;
  guestName?: string;
  start: Date;
  end: Date;
  source: "web" | "widget" | "admin" | "subscription";
}) {
  // Court muss zum Tenant gehoeren (verhindert Cross-Tenant-Booking)
  const court = await db.court.findFirst({
    where: { id: input.courtId, tenantId: input.tenantId },
  });
  if (!court) throw new Error("COURT_NOT_FOUND");

  // Member muss zum Tenant gehoeren
  if (input.memberId) {
    const member = await db.member.findFirst({
      where: { id: input.memberId, tenantId: input.tenantId },
    });
    if (!member) throw new Error("MEMBER_NOT_FOUND");
    if (input.source !== "admin") {
      const validation = await validateBooking({
        tenantId: input.tenantId,
        member,
        courtId: input.courtId,
        startsAt: input.start,
        endsAt: input.end,
      });
      if (!validation.ok) throw new Error(`RULE_VIOLATION:${validation.reason}`);
    }
  }

  // Preis berechnen (vor Transaction um Latency zu reduzieren)
  const member = input.memberId
    ? await db.member.findUnique({ where: { id: input.memberId } })
    : null;
  const zones = await loadZones(input.tenantId);
  const priceCents = priceFromZones(zones, {
    courtId: input.courtId,
    startsAt: input.start,
    memberGroup: member?.group ?? "guest",
  });

  const pinCode = generatePin();

  // ATOMARE Konflikt-Pruefung + Booking-Erstellung in EINER Transaction.
  // Verhindert Race-Condition (zwei parallele Buchungen auf gleichen Slot).
  const booking = await db.$transaction(async (tx) => {
    const conflict = await tx.booking.findFirst({
      where: {
        courtId: input.courtId,
        status: "confirmed",
        AND: [{ startsAt: { lt: input.end } }, { endsAt: { gt: input.start } }],
      },
    });
    if (conflict) throw new Error("SLOT_TAKEN");

    return tx.booking.create({
      data: {
        tenantId: input.tenantId,
        courtId: input.courtId,
        memberId: input.memberId ?? null,
        guestName: input.guestName ?? null,
        startsAt: input.start,
        endsAt: input.end,
        source: input.source,
        pinCode,
        pricePaid: priceCents,
      },
    });
  }, { isolationLevel: "Serializable" });

  // AccessGrant + Device-Trigger NACH der Transaction (best-effort, kein Booking-Rollback bei Hardware-Fehler)
  try {
    const courtMappings = await db.deviceMapping.findMany({
      where: { courtId: input.courtId, action: "door" },
    });
    for (const m of courtMappings) {
      await db.accessGrant.create({
        data: {
          bookingId: booking.id,
          deviceId: m.deviceId,
          pinCode,
          validFrom: new Date(input.start.getTime() - 30 * 60 * 1000),
          validUntil: new Date(input.end.getTime() + 30 * 60 * 1000),
        },
      });
      await executeDevice(m.deviceId, {
        action: "grant",
        pinCode,
        validFrom: input.start,
        validUntil: input.end,
      }).catch((e) => console.error("Device grant failed:", e));
    }
  } catch (e) {
    console.error("AccessGrant failed (booking still created):", e);
  }

  // Notify (best-effort)
  if (input.memberId) {
    notify({
      tenantId: input.tenantId,
      memberId: input.memberId,
      channel: "email",
      template: "booking_confirmed",
      subject: "Buchungsbestätigung",
      body: `${booking.startsAt.toLocaleString("de-AT")} | PIN: ${pinCode}`,
      meta: { bookingId: booking.id },
    }).catch((e) => console.error("Notify failed:", e));
  }

  return booking;
}

export async function cancelBooking(input: {
  tenantId: string;
  bookingId: string;
  memberId?: string;
}) {
  // Tenant + Owner-Check (Member kann nur eigene Buchungen stornieren)
  const booking = await db.booking.findFirst({
    where: { id: input.bookingId, tenantId: input.tenantId },
  });
  if (!booking) throw new Error("NOT_FOUND");
  if (input.memberId && booking.memberId !== input.memberId) {
    throw new Error("CROSS_MEMBER_FORBIDDEN");
  }

  const updated = await db.booking.update({
    where: { id: booking.id },
    data: { status: "cancelled", cancelledAt: new Date() },
  });

  // Wartelisten-Notify (best-effort)
  const waiting = await db.waitlistEntry.findFirst({
    where: {
      tenantId: booking.tenantId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      notified: false,
    },
    orderBy: { position: "asc" },
  });
  if (waiting) {
    await db.waitlistEntry.update({
      where: { id: waiting.id },
      data: { notified: true },
    });
    notify({
      tenantId: booking.tenantId,
      memberId: waiting.memberId,
      channel: "email",
      template: "waitlist_slot_free",
      subject: "Platz frei geworden",
      body: `Der Slot ${booking.startsAt.toLocaleString("de-AT")} ist frei.`,
    }).catch((e) => console.error("Waitlist notify failed:", e));
  }
  return updated;
}
