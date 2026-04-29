import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createBooking } from "@/lib/booking";

const Body = z.object({
  tenantSlug: z.string(),
  guestName: z.string().min(1).max(80),
  // Single-Slot (legacy)
  courtId: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  // Multi-Block
  blocks: z
    .array(z.object({ courtId: z.string(), start: z.string(), end: z.string() }))
    .optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({ where: { slug: parsed.data.tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
  }

  // Normalisiere zu blocks-Array (Single-Slot wird zu einem Block)
  const blocks =
    parsed.data.blocks ??
    (parsed.data.courtId && parsed.data.start && parsed.data.end
      ? [{ courtId: parsed.data.courtId, start: parsed.data.start, end: parsed.data.end }]
      : []);

  if (blocks.length === 0) {
    return NextResponse.json({ error: "NO_SLOTS" }, { status: 400 });
  }

  const created = [];
  const failed = [];
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
      created.push({ id: booking.id, pinCode: booking.pinCode, courtId: b.courtId, start: b.start, end: b.end });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "INTERNAL";
      failed.push({ courtId: b.courtId, start: b.start, end: b.end, error: msg });
    }
  }

  if (created.length === 0) {
    return NextResponse.json({ error: failed[0]?.error ?? "ALL_FAILED", failed }, { status: 409 });
  }

  return NextResponse.json({
    bookings: created,
    failed: failed.length ? failed : undefined,
  });
}
