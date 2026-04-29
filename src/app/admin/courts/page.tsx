import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";

async function createCourt(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  const lastOrder = await db.court.findFirst({
    where: { tenantId: t.id }, orderBy: { order: "desc" },
  });
  await db.court.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      surface: String(formData.get("surface")),
      category: String(formData.get("category")),
      order: (lastOrder?.order ?? 0) + 1,
    },
  });
  redirect("/admin/courts");
}

async function toggleCourt(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const c = await db.court.findUnique({ where: { id } });
  if (c) await db.court.update({ where: { id }, data: { active: !c.active } });
  redirect("/admin/courts");
}

export default async function CourtsList() {
  const tenant = await requireCurrentTenant();
  const courts = await db.court.findMany({
    where: { tenantId: tenant.id },
    orderBy: { order: "asc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Plätze" desc={`${courts.length} Einträge`} />

      <Table>
        <thead><tr>
          <Th>Reihenfolge</Th><Th>Name</Th><Th>Belag</Th><Th>Kategorie</Th><Th>Status</Th><Th></Th>
        </tr></thead>
        <tbody>
          {courts.map((c) => (
            <tr key={c.id}>
              <Td>{c.order}</Td>
              <Td>{c.name}</Td>
              <Td>{c.surface}</Td>
              <Td>{c.category}</Td>
              <Td>{c.active ? "aktiv" : "inaktiv"}</Td>
              <Td>
                <form action={toggleCourt} className="inline">
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs text-[#EEFF00]">{c.active ? "Deaktivieren" : "Aktivieren"}</button>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Platz hinzufuegen</h2>
        <form action={createCourt} className="grid grid-cols-3 gap-3 max-w-2xl">
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Belag">
            <select name="surface" className={inputCls}>
              <option value="clay">Sand</option>
              <option value="hard">Hartplatz</option>
              <option value="grass">Rasen</option>
              <option value="indoor">Halle</option>
              <option value="padel">Padel</option>
              <option value="beach">Beach</option>
            </select>
          </FormField>
          <FormField label="Kategorie">
            <select name="category" className={inputCls}>
              <option value="outdoor">Freiplatz</option>
              <option value="indoor">Halle</option>
              <option value="allweather">Allwetter</option>
              <option value="training">Training</option>
              <option value="padel">Padel</option>
            </select>
          </FormField>
          <div className="col-span-3"><Btn type="submit">+ Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
