import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Table, Th, Td, Stat } from "@/components/admin-ui";
import { fmtMoney } from "@/lib/money";

export default async function Sales() {
  const tenant = await requireCurrentTenant();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [sales, todaySum] = await Promise.all([
    db.sale.findMany({
      where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" }, take: 50,
      include: { member: true },
    }),
    db.sale.aggregate({
      where: { tenantId: tenant.id, createdAt: { gte: today } },
      _sum: { grossTotal: true },
    }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Kiosk-Verkäufe" />
      <Stat label="Umsatz heute" value={fmtMoney(todaySum._sum.grossTotal ?? 0)} />
      <Table>
        <thead><tr>
          <Th>Wann</Th><Th>Kunde</Th><Th>Brutto</Th><Th>Zahlung</Th>
        </tr></thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <Td className="text-xs">{s.createdAt.toLocaleString("de-AT")}</Td>
              <Td>{s.member?.name ?? "—"}</Td>
              <Td>{fmtMoney(s.grossTotal)}</Td>
              <Td>{s.paymentMethod}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
