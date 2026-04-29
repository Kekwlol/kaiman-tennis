import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Table, Th, Td } from "@/components/admin-ui";
import { fmtMoney } from "@/lib/money";

export default async function Payments() {
  const tenant = await requireCurrentTenant();
  const ps = await db.payment.findMany({
    where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" }, take: 100,
    include: { member: true },
  });
  return (
    <div>
      <PageHeader title="Zahlungen" desc="Stripe / SEPA / Bar / Wallet" />
      <Table>
        <thead><tr>
          <Th>Datum</Th><Th>Member</Th><Th>Betrag</Th><Th>Provider</Th><Th>Status</Th><Th>Ext-Ref</Th>
        </tr></thead>
        <tbody>
          {ps.map((p) => (
            <tr key={p.id}>
              <Td className="text-xs">{p.createdAt.toLocaleString("de-AT")}</Td>
              <Td>{p.member?.name ?? "—"}</Td>
              <Td>{fmtMoney(p.amount)}</Td>
              <Td>{p.provider}</Td>
              <Td>{p.status}</Td>
              <Td className="text-xs font-mono">{p.externalRef}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
