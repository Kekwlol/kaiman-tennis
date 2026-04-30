import { NextRequest, NextResponse } from "next/server";
import { buildMemberCalendar } from "@/lib/ical";
import { verifyIcalToken } from "@/lib/auth";

// iCal-Feed fuer ein Mitglied. Token = signiertes JWT mit Ablauf.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 401 });

  const memberId = verifyIcalToken(token);
  if (!memberId) return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });

  const ical = await buildMemberCalendar(memberId);
  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="kaiman-tennis.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
