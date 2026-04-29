import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { datevExport } from "@/lib/accounting";

export async function GET(req: NextRequest) {
  const slug = req.headers.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "NO_TENANT" }, { status: 400 });
  const t = await db.tenant.findUnique({ where: { slug } });
  if (!t) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()));
  const csv = await datevExport(t.id, year);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="datev-${t.slug}-${year}.csv"`,
    },
  });
}
