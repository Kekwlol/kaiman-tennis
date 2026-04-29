import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Table, Th, Td } from "@/components/admin-ui";

export default async function Notifications() {
  const tenant = await requireCurrentTenant();
  const ns = await db.notification.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ scheduledFor: "desc" }],
    take: 200,
    include: { member: true },
  });
  return (
    <div>
      <PageHeader title="Benachrichtigungen" desc="Mail/SMS/Push-Log" />
      <Table>
        <thead><tr>
          <Th>Wann</Th><Th>Empfänger</Th><Th>Kanal</Th><Th>Template</Th><Th>Betreff</Th><Th>Status</Th>
        </tr></thead>
        <tbody>
          {ns.map((n) => (
            <tr key={n.id}>
              <Td className="text-xs">{(n.sentAt ?? n.scheduledFor)?.toLocaleString("de-AT") ?? "—"}</Td>
              <Td>{n.member?.name ?? "—"}</Td>
              <Td>{n.channel}</Td>
              <Td className="text-xs">{n.template}</Td>
              <Td>{n.subject}</Td>
              <Td>
                <span className={`text-xs px-2 ${n.status === "sent" ? "bg-emerald-900 text-emerald-300" : n.status === "failed" ? "bg-red-900 text-red-300" : "bg-zinc-800"}`}>
                  {n.status}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
