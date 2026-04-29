import { NextRequest, NextResponse } from "next/server";
import { buildMemberCalendar } from "@/lib/ical";

// iCal-Feed fuer ein Mitglied. Token = memberId (im Production: signiertes JWT)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 401 });

  const ical = await buildMemberCalendar(token);
  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="kaiman-tennis.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
