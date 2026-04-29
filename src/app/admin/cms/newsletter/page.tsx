import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";
import { sendNewsletter } from "@/lib/notifications";

async function createNewsletter(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  const groups = String(formData.get("groups") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const nl = await db.newsletter.create({
    data: {
      tenantId: t.id,
      subject: String(formData.get("subject")),
      bodyMd: String(formData.get("body")),
      channel: String(formData.get("channel")),
      audienceJson: JSON.stringify({ groups }),
    },
  });
  if (formData.get("send") === "on") {
    await sendNewsletter(nl.id);
  }
  redirect("/admin/cms/newsletter");
}

async function send(formData: FormData) {
  "use server";
  await sendNewsletter(String(formData.get("id")));
  redirect("/admin/cms/newsletter");
}

export default async function NewsletterAdmin() {
  const tenant = await requireCurrentTenant();
  const list = await db.newsletter.findMany({
    where: { tenantId: tenant.id }, orderBy: { sentAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Newsletter" desc="E-Mail oder SMS an Mitgliedergruppen" />
      <Table>
        <thead><tr>
          <Th>Betreff</Th><Th>Kanal</Th><Th>Empfänger</Th><Th>Geöffnet</Th><Th>Versendet</Th><Th></Th>
        </tr></thead>
        <tbody>
          {list.map((n) => (
            <tr key={n.id}>
              <Td>{n.subject}</Td>
              <Td>{n.channel}</Td>
              <Td>{n.recipientCount}</Td>
              <Td>{n.openCount}</Td>
              <Td className="text-xs">{n.sentAt?.toLocaleString("de-AT") ?? "—"}</Td>
              <Td>
                {!n.sentAt && (
                  <form action={send} className="inline">
                    <input type="hidden" name="id" value={n.id} />
                    <button className="text-[#EEFF00] text-xs">Senden</button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neuer Newsletter</h2>
        <form action={createNewsletter} className="space-y-3 max-w-3xl">
          <FormField label="Betreff"><input name="subject" required className={inputCls} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Kanal">
              <select name="channel" className={inputCls}>
                <option value="email">E-Mail</option>
                <option value="sms">SMS</option>
              </select>
            </FormField>
            <FormField label="Zielgruppen (komma)" hint="leer = alle aktiven">
              <input name="groups" placeholder="adult,senior" className={inputCls} />
            </FormField>
          </div>
          <FormField label="Inhalt (Markdown)">
            <textarea name="body" rows={6} required className={inputCls} />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="send" /> Sofort senden
          </label>
          <Btn type="submit">Anlegen</Btn>
        </form>
      </div>
    </div>
  );
}
