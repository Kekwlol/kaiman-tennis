import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { authedAdmin } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { fmtMoney, parseMoney } from "@/lib/money";

async function createCourse(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const t = ctx.tenant;
  await db.course.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      type: String(formData.get("type")),
      description: String(formData.get("description") ?? "") || null,
      startsAt: new Date(String(formData.get("startsAt"))),
      endsAt: new Date(String(formData.get("endsAt"))),
      capacity: parseInt(String(formData.get("capacity") ?? 20)),
      minParticipants: parseInt(String(formData.get("minParticipants") ?? 0)),
      price: parseMoney(String(formData.get("price") ?? "0")),
      status: "published",
    },
  });
  redirect("/admin/courses");
}

export default async function CoursesList() {
  const tenant = await requireCurrentTenant();
  const cs = await db.course.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { registrations: true } } },
    orderBy: { startsAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Kurse / Camps / Events" />
      <Table>
        <thead><tr>
          <Th>Name</Th><Th>Typ</Th><Th>Wann</Th><Th>Anmeldungen</Th><Th>Preis</Th><Th>Status</Th>
        </tr></thead>
        <tbody>
          {cs.map((c) => (
            <tr key={c.id}>
              <Td>{c.name}</Td>
              <Td>{c.type}</Td>
              <Td className="text-xs">{c.startsAt.toLocaleDateString("de-AT")}</Td>
              <Td>{c._count.registrations}/{c.capacity}</Td>
              <Td>{fmtMoney(c.price)}</Td>
              <Td>{c.status}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neuer Kurs / Camp / Event</h2>
        <form action={createCourse} className="grid grid-cols-3 gap-3 max-w-3xl">
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Typ">
            <select name="type" className={inputCls}>
              <option value="course">Kurs</option>
              <option value="camp">Camp</option>
              <option value="event">Event</option>
            </select>
          </FormField>
          <FormField label="Preis"><input name="price" placeholder="0,00" className={inputCls} /></FormField>
          <FormField label="Beginn"><input name="startsAt" type="datetime-local" required className={inputCls} /></FormField>
          <FormField label="Ende"><input name="endsAt" type="datetime-local" required className={inputCls} /></FormField>
          <FormField label="Kapazitaet"><input name="capacity" type="number" defaultValue={20} className={inputCls} /></FormField>
          <FormField label="Min Teilnehmer"><input name="minParticipants" type="number" defaultValue={0} className={inputCls} /></FormField>
          <FormField label="Beschreibung"><input name="description" className={inputCls} /></FormField>
          <div />
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
