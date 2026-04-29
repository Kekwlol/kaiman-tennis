import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Table, Th, Td, Stat } from "@/components/admin-ui";
import { fmtMoney } from "@/lib/money";
import { annualReport } from "@/lib/accounting";
import Link from "next/link";

export default async function Ledger({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const tenant = await requireCurrentTenant();
  const y = parseInt(year ?? String(new Date().getFullYear()));
  const start = new Date(y, 0, 1);
  const end = new Date(y + 1, 0, 1);
  const [entries, report] = await Promise.all([
    db.ledgerEntry.findMany({
      where: { tenantId: tenant.id, date: { gte: start, lt: end } },
      include: { account: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    annualReport(tenant.id, y),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Einnahmen-Ausgaben-Rechnung"
        desc={`Jahr ${y}`}
        action={
          <a
            href={`/api/admin/accounting/datev?year=${y}`}
            className="border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900"
          >
            DATEV-Export ⬇
          </a>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Einnahmen" value={fmtMoney(report.revenue)} />
        <Stat label="Ausgaben" value={fmtMoney(report.expense)} />
        <Stat label="Gewinn" value={fmtMoney(report.profit)} />
      </div>

      <div className="flex gap-2 text-xs">
        {[y - 1, y, y + 1].map((yy) => (
          <Link key={yy} href={`?year=${yy}`} className={yy === y ? "text-[#EEFF00]" : "text-zinc-500"}>
            {yy}
          </Link>
        ))}
      </div>

      <Table>
        <thead><tr>
          <Th>Datum</Th><Th>Konto</Th><Th>Soll</Th><Th>Haben</Th><Th>Beschreibung</Th>
        </tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <Td className="text-xs">{e.date.toLocaleDateString("de-AT")}</Td>
              <Td className="font-mono text-xs">{e.account.code} {e.account.name}</Td>
              <Td>{e.debit ? fmtMoney(e.debit) : ""}</Td>
              <Td>{e.credit ? fmtMoney(e.credit) : ""}</Td>
              <Td className="text-xs">{e.description}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
