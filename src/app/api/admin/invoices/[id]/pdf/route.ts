import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { requireTenantAdmin } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const slug = req.headers.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "MISSING_TENANT" }, { status: 400 });
  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  try {
    await requireTenantAdmin(tenant.id);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const invoice = await db.invoice.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!invoice) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  try {
    const pdf = await generateInvoicePdf(invoice, tenant);
    const arr = new Uint8Array(pdf);
    return new NextResponse(arr, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("PDF generation failed:", e);
    return NextResponse.json({ error: "PDF_FAILED" }, { status: 500 });
  }
}
