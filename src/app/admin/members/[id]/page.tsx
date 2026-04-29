import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, FormField, Btn, inputCls, Card } from "@/components/admin-ui";
import { redirect, notFound } from "next/navigation";
import { fmtMoney } from "@/lib/money";

async function updateMember(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await db.member.update({
    where: { id },
    data: {
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      phone: String(formData.get("phone") ?? "") || null,
      group: String(formData.get("group")),
      status: String(formData.get("status")),
      visibility: String(formData.get("visibility")),
    },
  });
  redirect("/admin/members");
}

async function deleteMember(formData: FormData) {
  "use server";
  await db.member.delete({ where: { id: String(formData.get("id")) } });
  redirect("/admin/members");
}

export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await requireCurrentTenant();
  const member = await db.member.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      membershipPurchases: { include: { type: true }, orderBy: { validFrom: "desc" } },
      bookings: { orderBy: { startsAt: "desc" }, take: 10, include: { court: true } },
    },
  });
  if (!member) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title={member.name} desc={member.email} />

      <Card className="p-5">
        <h2 className="font-bold mb-4">Stammdaten</h2>
        <form action={updateMember} className="grid grid-cols-2 gap-4 max-w-2xl">
          <input type="hidden" name="id" value={member.id} />
          <FormField label="Name">
            <input name="name" defaultValue={member.name} className={inputCls} />
          </FormField>
          <FormField label="E-Mail">
            <input name="email" defaultValue={member.email} className={inputCls} />
          </FormField>
          <FormField label="Telefon">
            <input name="phone" defaultValue={member.phone ?? ""} className={inputCls} />
          </FormField>
          <FormField label="Gruppe">
            <select name="group" defaultValue={member.group} className={inputCls}>
              <option value="child">Kind</option>
              <option value="youth">Jugend</option>
              <option value="adult">Erwachsen</option>
              <option value="senior">Senior</option>
              <option value="family">Familie</option>
              <option value="guest">Gast</option>
            </select>
          </FormField>
          <FormField label="Status">
            <select name="status" defaultValue={member.status} className={inputCls}>
              <option value="active">aktiv</option>
              <option value="inactive">inaktiv</option>
              <option value="left">ausgetreten</option>
            </select>
          </FormField>
          <FormField label="Sichtbarkeit (Spielpartner)">
            <select name="visibility" defaultValue={member.visibility} className={inputCls}>
              <option value="public">Öffentlich</option>
              <option value="members">Nur Mitglieder</option>
              <option value="private">Privat</option>
            </select>
          </FormField>
          <div className="col-span-2 flex gap-3">
            <Btn type="submit">Speichern</Btn>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-4">Mitgliedschaften</h2>
        <ul className="text-sm space-y-2">
          {member.membershipPurchases.length === 0 && <li className="text-zinc-500">Keine.</li>}
          {member.membershipPurchases.map((p) => (
            <li key={p.id} className="flex justify-between border-b border-zinc-900 pb-2">
              <span>{p.type.name}</span>
              <span className="text-zinc-500 text-xs">
                {p.validFrom.toLocaleDateString("de-AT")} - {p.validUntil.toLocaleDateString("de-AT")} ·{" "}
                {fmtMoney(p.pricePaid)} · {p.paid ? "bezahlt" : "offen"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-4">Letzte Buchungen</h2>
        <ul className="text-sm space-y-1">
          {member.bookings.map((b) => (
            <li key={b.id} className="flex justify-between">
              <span>{b.court.name}</span>
              <span className="text-zinc-500">
                {b.startsAt.toLocaleString("de-AT", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5 border-red-900">
        <h2 className="font-bold mb-2 text-red-400">Gefahrenzone</h2>
        <form action={deleteMember}>
          <input type="hidden" name="id" value={member.id} />
          <Btn variant="danger" type="submit">Mitglied löschen</Btn>
        </form>
      </Card>
    </div>
  );
}
