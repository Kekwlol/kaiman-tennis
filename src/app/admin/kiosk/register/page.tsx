import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Card } from "@/components/admin-ui";
import { fmtMoney } from "@/lib/money";
import { RegisterClient } from "./client";

export default async function Register() {
  const tenant = await requireCurrentTenant();
  const products = await db.product.findMany({
    where: { tenantId: tenant.id, active: true, stock: { gt: 0 } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const session = await db.registerSession.findFirst({
    where: { tenantId: tenant.id, closedAt: null },
  });
  return (
    <div>
      <PageHeader title="Kasse" desc={session ? "Sitzung offen" : "Sitzung geschlossen"} />
      <RegisterClient
        tenantSlug={tenant.slug}
        sessionOpen={!!session}
        products={products.map((p) => ({
          id: p.id, name: p.name, price: p.price, vatRate: p.vatRate, stock: p.stock,
          category: p.category,
        }))}
      />
    </div>
  );
}
