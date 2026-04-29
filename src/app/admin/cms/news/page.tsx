import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";

async function createNews(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  await db.news.create({
    data: {
      tenantId: t.id,
      title: String(formData.get("title")),
      body: String(formData.get("body")),
    },
  });
  redirect("/admin/cms/news");
}

async function deleteNews(formData: FormData) {
  "use server";
  await db.news.delete({ where: { id: String(formData.get("id")) } });
  redirect("/admin/cms/news");
}

export default async function News() {
  const tenant = await requireCurrentTenant();
  const list = await db.news.findMany({
    where: { tenantId: tenant.id }, orderBy: { publishedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="News" />
      <Table>
        <thead><tr><Th>Titel</Th><Th>Datum</Th><Th></Th></tr></thead>
        <tbody>
          {list.map((n) => (
            <tr key={n.id}>
              <Td>{n.title}</Td>
              <Td className="text-xs">{n.publishedAt.toLocaleString("de-AT")}</Td>
              <Td>
                <form action={deleteNews} className="inline">
                  <input type="hidden" name="id" value={n.id} />
                  <button className="text-xs text-red-400">Löschen</button>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neue News</h2>
        <form action={createNews} className="space-y-3 max-w-3xl">
          <FormField label="Titel"><input name="title" required className={inputCls} /></FormField>
          <FormField label="Text (Markdown)" hint="**fett**, *kursiv*, [link](url)">
            <textarea name="body" rows={6} required className={inputCls} />
          </FormField>
          <Btn type="submit">Veröffentlichen</Btn>
        </form>
      </div>
    </div>
  );
}
