import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, FormField, Btn, inputCls } from "@/components/admin-ui";

async function createMember(formData: FormData) {
  "use server";
  const headers = await import("next/headers").then((m) => m.headers());
  const slug = (await headers).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");

  await db.member.create({
    data: {
      tenantId: t.id,
      email: String(formData.get("email")),
      name: String(formData.get("name")),
      phone: String(formData.get("phone") ?? "") || null,
      group: String(formData.get("group") ?? "adult"),
    },
  });
  redirect("/admin/members");
}

export default async function NewMember() {
  await requireCurrentTenant();
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
