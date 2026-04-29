import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { applyVat } from "@/lib/money";

const Body = z.object({
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().positive() })),
  paymentMethod: z.string(),
});

export async function POST(req: NextRequest) {
  const slug = req.headers.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "NO_TENANT" }, { status: 400 });
  const t = await db.tenant.findUnique({ where: { slug } });
  if (!t) return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

  const ids = parsed.data.items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: ids }, tenantId: t.id } });

  let netTotal = 0;
  let vatTotal = 0;
  const lines = parsed.data.items.map((it) => {
    const p = products.find((x) => x.id === it.productId);
    if (!p) throw new Error("PRODUCT_NOT_FOUND");
    if (p.stock < it.qty) throw new Error("OUT_OF_STOCK");
    const lineGross = p.price * it.qty;
    const { net, vat } = (() => {
      const n = Math.round((lineGross * 10000) / (10000 + p.vatRate));
      return { net: n, vat: lineGross - n };
    })();
    netTotal += net;
    vatTotal += vat;
    return { productId: p.id, qty: it.qty, price: p.price };
  });
  const grossTotal = netTotal + vatTotal;

  const session = await db.registerSession.findFirst({
    where: { tenantId: t.id, closedAt: null },
  });

  await db.$transaction([
    db.sale.create({
      data: {
        tenantId: t.id,
        itemsJson: JSON.stringify(lines),
        netTotal,
        vatTotal,
        grossTotal,
        paymentMethod: parsed.data.paymentMethod,
        registerSessionId: session?.id ?? null,
      },
    }),
    ...parsed.data.items.map((it) =>
      db.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.qty } },
      }),
    ),
  ]);

  return NextResponse.json({ ok: true, total: grossTotal });
}
