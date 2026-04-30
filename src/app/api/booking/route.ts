import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createBooking } from "@/lib/booking";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const Body = z.object({
  tenantSlug: z.string().min(1).max(80),
  guestName: z.string().min(1).max(80),
  courtId: z.string().min(1).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  blocks: z
    .array(
      z.object({
        courtId: z.string().min(1),
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    )
    .max(10) // max 10 Slots auf einmal (gegen DoS)
    .optional(),
});

export async function POST(req: NextRequest) {
  // Rate-Limit: max 30 Buchungs-Requests/15min/IP
  const ip = getClientIp(req.headers);
  if (!rateLimit(`book:${ip}`, 30, 15 * 60_000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const tenant = await db.tenant.findUnique({ where: { slug: parsed.data.tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
  }

  const blocks =
    parsed.data.blocks ??
    (parsed.data.courtId && parsed.data.start && parsed.data.end
      ? [{ courtId: parsed.data.courtId, start: parsed.data.start, end: parsed.data.end }]
      : []);

  if (blocks.length === 0) {
    return NextResponse.json({ error: "NO_SLOTS" }, { status: 400 });
  }

  // Validierung pro Block: max 4h Dauer, Zukunft, max 30 Tage voraus
  const now = Date.now();
  const MAX_DURATION_MS = 4 * 3600_000;
  const MAX_ADVANCE_MS = 30 * 24 * 3600_000;
  for (const b of blocks) {
    const start = new Date(b.start).getTime();
    const end = new Date(b.end).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) {
      return NextResponse.json({ error: "INVALID_DATES" }, { status: 400 });
    }
    if (start < now - 60_000) {
      return NextResponse.json({ error: "PAST_DATE" }, { status: 400 });
    }
    if (start > now + MAX_ADVANCE_MS) {
      return NextResponse.json({ error: "TOO_FAR_AHEAD" }, { status: 400 });
    }
    if (end - start > MAX_DURATION_MS) {
      return NextResponse.json({ error: "DURATION_TOO_LONG" }, { status: 400 });
    }
  }

  const created: Array<{ id: string; pinCode: string | null; courtId: string; start: string; end: string }> = [];
  const failed: Array<{ courtId: string; start: string; end: string; error: string }> = [];

  for (const b of blocks) {
    try {
      const booking = await createBooking({
        tenantId: tenant.id,
        courtId: b.courtId,
        guestName: parsed.data.guestName,
        start: new Date(b.start),
        end: new Date(b.end),
        source: "web",
      });
      created.push({
        id: booking.id,
        pinCode: booking.pinCode,
        courtId: b.courtId,
        start: b.start,
        end: b.end,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "INTERNAL";
      failed.push({ courtId: b.courtId, start: b.start, end: b.end, error: msg });
    }
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: failed[0]?.error ?? "ALL_FAILED", failed },
      { status: 409 },
    );
  }

  return NextResponse.json({
    bookings: created,
    failed: failed.length ? failed : undefined,
  });
}
