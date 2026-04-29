import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";
import Link from "next/link";

async function createLadder(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  await db.ladder.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      format: String(formData.get("format")),
      matchType: String(formData.get("matchType")),
      category: String(formData.get("category")),
      seasonStart: new Date(String(formData.get("seasonStart"))),
      seasonEnd: new Date(String(formData.get("seasonEnd"))),
    },
  });
  redirect("/admin/ladders");
}

export default async function LaddersList() {
  const tenant = await requireCurrentTenant();
  const ladders = await db.ladder.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: { select: { participants: true, challenges: true } },
    },
    orderBy: { seasonStart: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Forderungspyramiden" desc="Pyramide oder Punktesystem" />
      <Table>
        <thead><tr>
          <Th>Name</Th><Th>Format</Th><Th>Kategorie</Th><Th>Saison</Th><Th>Spieler</Th><Th>Forderungen</Th><Th></Th>
        </tr></thead>
        <tbody>
          {ladders.map((l) => (
            <tr key={l.id}>
              <Td>{l.name}</Td>
              <Td>{l.format}</Td>
              <Td>{l.category}</Td>
              <Td className="text-xs">{l.seasonStart.toLocaleDateString("de-AT")} - {l.seasonEnd.toLocaleDateString("de-AT")}</Td>
              <Td>{l._count.participants}</Td>
              <Td>{l._count.challenges}</Td>
              <Td>
                <Link href={`/admin/ladders/${l.id}`} className="text-[#EEFF00] text-xs">Verwalten</Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neue Pyramide / Rangliste</h2>
        <form action={createLadder} className="grid grid-cols-3 gap-3 max-w-3xl">
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Format">
            <select name="format" className={inputCls}>
              <option value="pyramid">Pyramide</option>
              <option value="points">Punktesystem</option>
              <option value="roundrobin">Round Robin</option>
            </select>
          </FormField>
          <FormField label="Match-Typ">
            <select name="matchType" className={inputCls}>
              <option value="singles">Einzel</option>
              <option value="doubles">Doppel</option>
              <option value="mixed">Mixed</option>
            </select>
          </FormField>
          <FormField label="Kategorie">
            <select name="category" className={inputCls}>
              <option value="open">Offen</option>
              <option value="men">Herren</option>
              <option value="women">Damen</option>
              <option value="youth">Jugend</option>
              <option value="seniors">Senioren</option>
              <option value="guests">Gaeste</option>
            </select>
          </FormField>
          <FormField label="Saisonstart"><input name="seasonStart" type="date" required className={inputCls} /></FormField>
          <FormField label="Saisonende"><input name="seasonEnd" type="date" required className={inputCls} /></FormField>
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
