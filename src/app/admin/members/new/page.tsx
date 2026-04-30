import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, FormField, Btn, inputCls } from "@/components/admin-ui";
import { authedAdmin, logMutation } from "@/lib/server-action";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  group: z.enum(["child", "youth", "adult", "senior", "family", "guest"]),
});

async function createMember(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const parsed = Schema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    group: formData.get("group"),
  });
  // Doppel-Check: Email darf in diesem Tenant nicht doppelt
  const existing = await db.member.findUnique({
    where: { tenantId_email: { tenantId: ctx.tenant.id, email: parsed.email } },
  });
  if (existing) throw new Error("EMAIL_ALREADY_EXISTS");

  const member = await db.member.create({
    data: {
      tenantId: ctx.tenant.id,
      email: parsed.email,
      name: parsed.name,
      phone: parsed.phone || null,
      group: parsed.group,
    },
  });
  await logMutation(ctx, "Member", member.id, "create", null, parsed);
  redirect("/admin/members");
}

export default async function NewMember() {
  await authedAdmin();
  return (
    <div>
      <PageHeader title="Neues Mitglied" />
      <form action={createMember} className="space-y-4 max-w-md">
        <FormField label="Name">
          <input name="name" required className={inputCls} />
        </FormField>
        <FormField label="E-Mail">
          <input name="email" type="email" required className={inputCls} />
        </FormField>
        <FormField label="Telefon">
          <input name="phone" className={inputCls} />
        </FormField>
        <FormField label="Gruppe">
          <select name="group" defaultValue="adult" className={inputCls}>
            <option value="child">Kind</option>
            <option value="youth">Jugend</option>
            <option value="adult">Erwachsen</option>
            <option value="senior">Senior</option>
            <option value="family">Familie</option>
            <option value="guest">Gast</option>
          </select>
        </FormField>
        <Btn type="submit">Anlegen</Btn>
      </form>
    </div>
  );
}
