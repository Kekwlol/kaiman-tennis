import { db } from "./db";
import { validateBooking } from "./booking-rules";
import { calculatePrice, loadZones, priceFromZones } from "./pricing";
import { notify } from "./notifications";
import { executeDevice } from "./devices";
import { fetchHourlyForecast, weatherEmoji } from "./weather";

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

  // Alle Daten parallel laden (statt N+1 calculatePrice-Calls)
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

export async function createBooking(input: {
  tenantId: string;
  courtId: string;
  memberId?: string;
  guestName?: string;
  start: Date;
  end: Date;
  source: "web" | "widget" | "admin" | "subscription";
}) {
  // 1. Regel-Prüfung wenn Member
  if (input.memberId) {
    const member = await db.member.findUnique({ where: { id: input.memberId } });
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

  // 2. Konflikt-Prüfung (atomare Transaktion)
  const conflict = await db.booking.findFirst({
    where: {
      courtId: input.courtId,
      status: "confirmed",
      AND: [{ startsAt: { lt: input.end } }, { endsAt: { gt: input.start } }],
    },
  });
  if (conflict) throw new Error("SLOT_TAKEN");

  // 3. Preis berechnen
  const member = input.memberId
    ? await db.member.findUnique({ where: { id: input.memberId } })
    : null;
  const priceCents = await calculatePrice({
    tenantId: input.tenantId,
    courtId: input.courtId,
    startsAt: input.start,
    endsAt: input.end,
    memberGroup: member?.group ?? "guest",
  });

  // 4. Booking + AccessGrant gemeinsam erstellen
  const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
  const booking = await db.booking.create({
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

  // 5. AccessGrant für Zutritt-Devices
  const courtMappings = await db.deviceMapping.findMany({
    where: { courtId: input.courtId, action: "door" },
    include: { device: true },
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
    });
  }

  // 6. Notify
  if (input.memberId) {
    await notify({
      tenantId: input.tenantId,
      memberId: input.memberId,
      channel: "email",
      template: "booking_confirmed",
      subject: "Buchungsbestätigung",
      body: `${booking.startsAt.toLocaleString("de-AT")} | PIN: ${pinCode}`,
      meta: { bookingId: booking.id },
    });
  }

  return booking;
}

export async function cancelBooking(bookingId: string) {
  const booking = await db.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  // Wartelistenprüfung
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
    await notify({
      tenantId: booking.tenantId,
      memberId: waiting.memberId,
      channel: "email",
      template: "waitlist_slot_free",
      subject: "Platz frei geworden",
      body: `Der Slot ${booking.startsAt.toLocaleString("de-AT")} ist frei.`,
    });
    await db.waitlistEntry.update({
      where: { id: waiting.id },
      data: { notified: true },
    });
  }
  return booking;
}
