import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Table, Th, Td } from "@/components/admin-ui";

export default async function MatchRequests() {
  const tenant = await requireCurrentTenant();
  const reqs = await db.matchRequest.findMany({
    where: { tenantId: tenant.id },
    include: { member: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Spielpartner-Suche" desc={`${reqs.length} aktive Anfragen`} />
      <Table>
        <thead><tr>
          <Th>Spieler</Th><Th>Zeitfenster</Th><Th>Skill-Range</Th><Th>Typ</Th><Th>Status</Th>
        </tr></thead>
        <tbody>
          {reqs.map((r) => (
            <tr key={r.id}>
              <Td>{r.member.name}</Td>
              <Td className="text-xs">{r.dateFrom.toLocaleDateString("de-AT")} - {r.dateUntil.toLocaleDateString("de-AT")}</Td>
              <Td>{r.skillMin} - {r.skillMax}</Td>
              <Td>{r.matchType}</Td>
              <Td>{r.status}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
