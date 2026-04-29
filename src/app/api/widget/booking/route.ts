import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createBooking } from "@/lib/booking";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const Body = z.object({
  apiKey: z.string(),
  courtId: z.string(),
  start: z.string(),
  end: z.string(),
  guestName: z.string().min(1).max(80),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400, headers: CORS });
  }

  const tenant = await db.tenant.findUnique({
    where: { apiKey: parsed.data.apiKey },
  });
  if (!tenant) {
    return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401, headers: CORS });
  }

  try {
    const booking = await createBooking({
      tenantId: tenant.id,
      courtId: parsed.data.courtId,
      guestName: parsed.data.guestName,
      start: new Date(parsed.data.start),
      end: new Date(parsed.data.end),
      source: "widget",
    });
    return NextResponse.json(
      { id: booking.id, pinCode: booking.pinCode },
      { headers: CORS },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return NextResponse.json({ error: msg }, { status: 409, headers: CORS });
  }
}
