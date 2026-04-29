import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";

async function createPage(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  await db.page.create({
    data: {
      tenantId: t.id,
      slug: String(formData.get("slug")),
      title: String(formData.get("title")),
      contentMd: String(formData.get("content")),
      locale: String(formData.get("locale") ?? "de"),
      publishedAt: formData.get("publish") === "on" ? new Date() : null,
    },
  });
  redirect("/admin/cms/pages");
}

export default async function Pages() {
  const tenant = await requireCurrentTenant();
  const pages = await db.page.findMany({
    where: { tenantId: tenant.id }, orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Seiten (CMS)" desc="Markdown-basiert, mehrsprachig" />
      <Table>
        <thead><tr><Th>Titel</Th><Th>Slug</Th><Th>Locale</Th><Th>Status</Th></tr></thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id}>
              <Td>{p.title}</Td>
              <Td className="text-xs font-mono">{p.slug}</Td>
              <Td>{p.locale}</Td>
              <Td>{p.publishedAt ? "veröffentlicht" : "Entwurf"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neue Seite</h2>
        <form action={createPage} className="space-y-3 max-w-3xl">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Titel"><input name="title" required className={inputCls} /></FormField>
            <FormField label="URL-Slug" hint="z.B. anlage"><input name="slug" required className={inputCls} /></FormField>
            <FormField label="Locale">
              <select name="locale" className={inputCls}>
                <option value="de">de</option>
                <option value="en">en</option>
                <option value="it">it</option>
              </select>
            </FormField>
          </div>
          <FormField label="Inhalt (Markdown)">
            <textarea name="content" rows={10} required className={inputCls} />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="publish" defaultChecked /> Sofort veröffentlichen
          </label>
          <Btn type="submit">Anlegen</Btn>
        </form>
      </div>
    </div>
  );
}
