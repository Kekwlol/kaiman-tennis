import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createBooking } from "@/lib/booking";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
    "Vary": "Origin",
  };
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

const Body = z.object({
  apiKey: z.string().min(1),
  courtId: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
  guestName: z.string().min(1).max(80),
});

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req.headers.get("origin"));
  const ip = getClientIp(req.headers);
  if (!rateLimit(`widget-book:${ip}`, 10, 15 * 60_000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: cors });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400, headers: cors });
  }

  const tenant = await db.tenant.findUnique({ where: { apiKey: parsed.data.apiKey } });
  if (!tenant) {
    return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401, headers: cors });
  }

  // Same date validation as web booking
  const start = new Date(parsed.data.start).getTime();
  const end = new Date(parsed.data.end).getTime();
  const now = Date.now();
  if (end <= start) return NextResponse.json({ error: "INVALID_DATES" }, { status: 400, headers: cors });
  if (start < now - 60_000) return NextResponse.json({ error: "PAST_DATE" }, { status: 400, headers: cors });
  if (start > now + 30 * 24 * 3600_000)
    return NextResponse.json({ error: "TOO_FAR_AHEAD" }, { status: 400, headers: cors });
  if (end - start > 4 * 3600_000)
    return NextResponse.json({ error: "DURATION_TOO_LONG" }, { status: 400, headers: cors });

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
      { headers: cors },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return NextResponse.json({ error: msg }, { status: 409, headers: cors });
  }
}
