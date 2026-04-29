import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Stat, Card } from "@/components/admin-ui";
import { fmtMoney } from "@/lib/money";

export default async function AdminDashboard() {
  const tenant = await requireCurrentTenant();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [members, courts, todayBookings, openChallenges, runningTournaments, openInvoices, lowStock] =
    await Promise.all([
      db.member.count({ where: { tenantId: tenant.id, status: "active" } }),
      db.court.count({ where: { tenantId: tenant.id, active: true } }),
      db.booking.count({
        where: { tenantId: tenant.id, startsAt: { gte: today, lt: tomorrow }, status: "confirmed" },
      }),
      db.challenge.count({
        where: { ladder: { tenantId: tenant.id }, status: { in: ["pending", "accepted"] } },
      }),
      db.tournament.count({
        where: { tenantId: tenant.id, status: { in: ["registration", "seeded", "running"] } },
      }),
      db.invoice.aggregate({
        where: { tenantId: tenant.id, paid: false, cancelledAt: null },
        _sum: { grossTotal: true },
      }),
      db.product.count({
        where: { tenantId: tenant.id, active: true, stock: { lt: 5 } },
      }),
    ]);

  const upcomingBookings = await db.booking.findMany({
    where: { tenantId: tenant.id, status: "confirmed", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 5,
    include: { court: true, member: true },
  });

  return (
    <div>
      <PageHeader title="Dashboard" desc={`Heute: ${today.toLocaleDateString("de-AT")}`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Mitglieder aktiv" value={members.toString()} />
        <Stat label="Plätze" value={courts.toString()} />
        <Stat label="Buchungen heute" value={todayBookings.toString()} />
        <Stat label="Offene Forderungen" value={openChallenges.toString()} />
        <Stat label="Laufende Turniere" value={runningTournaments.toString()} />
        <Stat label="Offene Rechnungen" value={fmtMoney(openInvoices._sum.grossTotal ?? 0)} />
        <Stat label="Niedriger Lagerbestand" value={lowStock.toString()} hint="Produkte unter 5 Stück" />
      </div>

      <Card className="p-5">
        <h2 className="font-bold mb-4">Nächste 5 Buchungen</h2>
        <ul className="text-sm space-y-2">
          {upcomingBookings.length === 0 && (
            <li className="text-zinc-500">Keine kommenden Buchungen.</li>
          )}
          {upcomingBookings.map((b) => (
            <li key={b.id} className="flex justify-between">
              <span>
                {b.court.name} —{" "}
                {b.startsAt.toLocaleString("de-AT", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-zinc-500">{b.member?.name ?? b.guestName ?? "—"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
