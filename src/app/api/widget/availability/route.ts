import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAvailability } from "@/lib/booking";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Öffentliches Endpoint für das Widget
// Auth via apiKey query param (Tenant-spezifisch)
export async function GET(req: NextRequest) {
  const apiKey = req.nextUrl.searchParams.get("key");
  const dateStr = req.nextUrl.searchParams.get("date");
  if (!apiKey) {
    return NextResponse.json(
      { error: "MISSING_API_KEY" },
      { status: 401, headers: CORS },
    );
  }

  const tenant = await db.tenant.findUnique({ where: { apiKey } });
  if (!tenant) {
    return NextResponse.json(
      { error: "INVALID_API_KEY" },
      { status: 401, headers: CORS },
    );
  }

  const date = dateStr ? new Date(dateStr) : new Date();
  date.setHours(0, 0, 0, 0);
  const slots = await getAvailability(tenant.id, date);

  return NextResponse.json(
    {
      tenant: { name: tenant.name, primaryColor: tenant.primaryColor },
      date: date.toISOString(),
      slots,
    },
    { headers: CORS },
  );
}
