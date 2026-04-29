import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Table, Th, Td } from "@/components/admin-ui";
import { fmtMoney } from "@/lib/money";

export default async function BookingsList({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;
  const tenant = await requireCurrentTenant();
  const where = {
    tenantId: tenant.id,
    ...(scope === "past" ? { startsAt: { lt: new Date() } } : { startsAt: { gte: new Date() } }),
  };
  const bookings = await db.booking.findMany({
    where, orderBy: { startsAt: scope === "past" ? "desc" : "asc" },
    take: 100,
    include: { court: true, member: true },
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Buchungen" desc="100 letzte / kommende" />
      <div className="flex gap-3 text-sm">
        <a href="?scope=upcoming" className={!scope || scope === "upcoming" ? "text-[#EEFF00]" : "text-zinc-500"}>Kommende</a>
        <a href="?scope=past" className={scope === "past" ? "text-[#EEFF00]" : "text-zinc-500"}>Vergangene</a>
      </div>
      <Table>
        <thead><tr>
          <Th>Wann</Th><Th>Platz</Th><Th>Spieler</Th><Th>Quelle</Th><Th>Preis</Th><Th>Status</Th>
        </tr></thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <Td>{b.startsAt.toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</Td>
              <Td>{b.court.name}</Td>
              <Td>{b.member?.name ?? b.guestName ?? "—"}</Td>
              <Td className="text-xs text-zinc-500">{b.source}</Td>
              <Td>{fmtMoney(b.pricePaid)}</Td>
              <Td>{b.status}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
