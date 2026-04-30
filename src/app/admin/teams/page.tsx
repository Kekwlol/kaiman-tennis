import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { authedAdmin } from "@/lib/server-action";
import { redirect } from "next/navigation";

async function createTeam(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const t = ctx.tenant;
  await db.team.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      league: String(formData.get("league") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
    },
  });
  redirect("/admin/teams");
}

export default async function TeamsList() {
  const tenant = await requireCurrentTenant();
  const teams = await db.team.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { members: true, matches: true } } },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Mannschaften" />
      <Table>
        <thead><tr>
          <Th>Name</Th><Th>Liga</Th><Th>Spieler</Th><Th>Spiele</Th>
        </tr></thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.id}>
              <Td>{t.name}</Td>
              <Td className="text-xs">{t.league} {t.division}</Td>
              <Td>{t._count.members}</Td>
              <Td>{t._count.matches}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neue Mannschaft</h2>
        <form action={createTeam} className="grid grid-cols-3 gap-3 max-w-2xl">
          <FormField label="Name"><input name="name" placeholder="Herren 1" required className={inputCls} /></FormField>
          <FormField label="Liga"><input name="league" placeholder="Landesliga A" className={inputCls} /></FormField>
          <FormField label="Division"><input name="division" placeholder="Gruppe Nord" className={inputCls} /></FormField>
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
