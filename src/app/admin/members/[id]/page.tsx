import { db } from "@/lib/db";
import { PageHeader, FormField, Btn, inputCls, Card } from "@/components/admin-ui";
import { redirect, notFound } from "next/navigation";
import { fmtMoney } from "@/lib/money";
import { authedAdmin, logMutation } from "@/lib/server-action";
import { z } from "zod";

const MemberSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  group: z.enum(["child", "youth", "adult", "senior", "family", "guest"]),
  status: z.enum(["active", "inactive", "left"]),
  visibility: z.enum(["public", "members", "private"]),
});

async function updateMember(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const id = String(formData.get("id"));
  const existing = await db.member.findFirst({ where: { id, tenantId: ctx.tenant.id } });
  if (!existing) throw new Error("NOT_FOUND_OR_FORBIDDEN");

  const parsed = MemberSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    group: formData.get("group"),
    status: formData.get("status"),
    visibility: formData.get("visibility"),
  });
  await db.member.update({
    where: { id },
    data: {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone || null,
      group: parsed.group,
      status: parsed.status,
      visibility: parsed.visibility,
    },
  });
  await logMutation(ctx, "Member", id, "update", existing, parsed);
  redirect("/admin/members");
}

async function deleteMember(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const id = String(formData.get("id"));
  const target = await db.member.findFirst({ where: { id, tenantId: ctx.tenant.id } });
  if (!target) throw new Error("NOT_FOUND_OR_FORBIDDEN");
  await db.member.delete({ where: { id } });
  await logMutation(ctx, "Member", id, "delete", target, null);
  redirect("/admin/members");
}

export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authedAdmin();
  const member = await db.member.findFirst({
    where: { id, tenantId: ctx.tenant.id },
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
        <h2 className="font-semibold mb-4">Stammdaten</h2>
        <form action={updateMember} className="grid grid-cols-2 gap-4 max-w-2xl">
          <input type="hidden" name="id" value={member.id} />
          <FormField label="Name">
            <input name="name" defaultValue={member.name} required className={inputCls} />
          </FormField>
          <FormField label="E-Mail">
            <input name="email" type="email" defaultValue={member.email} required className={inputCls} />
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
        <h2 className="font-semibold mb-4">Mitgliedschaften</h2>
        <ul className="text-sm space-y-2">
          {member.membershipPurchases.length === 0 && <li className="text-stone-500">Keine.</li>}
          {member.membershipPurchases.map((p) => (
            <li key={p.id} className="flex justify-between border-b border-stone-100 pb-2">
              <span>{p.type.name}</span>
              <span className="text-stone-500 text-xs">
                {p.validFrom.toLocaleDateString("de-AT")} — {p.validUntil.toLocaleDateString("de-AT")} ·{" "}
                {fmtMoney(p.pricePaid)} · {p.paid ? "bezahlt" : "offen"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Letzte Buchungen</h2>
        <ul className="text-sm space-y-1">
          {member.bookings.map((b) => (
            <li key={b.id} className="flex justify-between">
              <span>{b.court.name}</span>
              <span className="text-stone-500">
                {b.startsAt.toLocaleString("de-AT", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5 border-red-200 bg-red-50/30">
        <h2 className="font-semibold mb-2 text-red-700">Gefahrenzone</h2>
        <p className="text-sm text-stone-600 mb-3">
          Löschen entfernt das Mitglied unwiderruflich.
        </p>
        <form action={deleteMember}>
          <input type="hidden" name="id" value={member.id} />
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            Mitglied löschen
          </button>
        </form>
      </Card>
    </div>
  );
}
