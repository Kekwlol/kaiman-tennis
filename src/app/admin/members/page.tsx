import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td } from "@/components/admin-ui";
import Link from "next/link";

export default async function MembersList() {
  const tenant = await requireCurrentTenant();
  const members = await db.member.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { _count: { select: { bookings: true, challengesIssued: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Mitglieder"
        desc={`${members.length} Einträge`}
        action={<Btn href="/admin/members/new">+ Neu</Btn>}
      />
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>E-Mail</Th>
            <Th>Gruppe</Th>
            <Th>Skill</Th>
            <Th>Status</Th>
            <Th>Buchungen</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <Td>{m.name}</Td>
              <Td className="text-zinc-400">{m.email}</Td>
              <Td>{m.group}</Td>
              <Td className="text-xs">{m.skillScore}</Td>
              <Td>
                <span
                  className={`text-xs px-2 py-0.5 ${
                    m.status === "active" ? "bg-emerald-900 text-emerald-300" : "bg-zinc-800"
                  }`}
                >
                  {m.status}
                </span>
              </Td>
              <Td>{m._count.bookings}</Td>
              <Td>
                <Link href={`/admin/members/${m.id}`} className="text-[#EEFF00] text-xs">
                  Bearbeiten
                </Link>
              </Td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <Td className="text-zinc-500 italic">Noch keine Mitglieder.</Td>
              <Td /><Td /><Td /><Td /><Td /><Td />
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
