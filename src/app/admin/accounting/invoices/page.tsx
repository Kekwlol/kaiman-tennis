import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";
import { fmtMoney, parseMoney } from "@/lib/money";
import { createInvoice, recordPayment } from "@/lib/accounting";

async function createInv(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  await createInvoice({
    tenantId: t.id,
    recipientName: String(formData.get("recipientName")),
    recipientEmail: String(formData.get("recipientEmail") ?? "") || undefined,
    items: [
      {
        description: String(formData.get("description")),
        qty: parseInt(String(formData.get("qty") ?? 1)),
        unitPriceNet: parseMoney(String(formData.get("unitPrice"))),
        vatRate: parseInt(String(formData.get("vatRate") ?? 2000)),
      },
    ],
    dueInDays: parseInt(String(formData.get("dueInDays") ?? 14)),
  });
  redirect("/admin/accounting/invoices");
}

async function pay(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  await recordPayment({
    tenantId: t.id,
    invoiceId: String(formData.get("id")),
    amount: parseMoney(String(formData.get("amount"))),
  });
  redirect("/admin/accounting/invoices");
}

export default async function Invoices() {
  const tenant = await requireCurrentTenant();
  const invoices = await db.invoice.findMany({
    where: { tenantId: tenant.id }, orderBy: { issuedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Rechnungen" />
      <Table>
        <thead><tr>
          <Th>Nr</Th><Th>Empfänger</Th><Th>Datum</Th><Th>Brutto</Th><Th>Status</Th><Th>Fällig</Th><Th></Th>
        </tr></thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id}>
              <Td className="font-mono text-xs">{i.number}</Td>
              <Td>{i.recipientName}</Td>
              <Td className="text-xs">{i.issuedAt.toLocaleDateString("de-AT")}</Td>
              <Td>{fmtMoney(i.grossTotal)}</Td>
              <Td>
                <span className={`text-xs px-2 py-0.5 ${i.paid ? "bg-emerald-900 text-emerald-300" : "bg-amber-900 text-amber-300"}`}>
                  {i.paid ? "bezahlt" : "offen"}
                </span>
              </Td>
              <Td className="text-xs">{i.dueDate.toLocaleDateString("de-AT")}</Td>
              <Td>
                {!i.paid && (
                  <form action={pay} className="flex gap-1 text-xs">
                    <input type="hidden" name="id" value={i.id} />
                    <input name="amount" defaultValue={(i.grossTotal / 100).toFixed(2).replace(".", ",")} className={inputCls + " w-20"} />
                    <button className="text-[#EEFF00]">OK</button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neue Rechnung</h2>
        <form action={createInv} className="grid grid-cols-3 gap-3 max-w-3xl">
          <FormField label="Empfänger Name"><input name="recipientName" required className={inputCls} /></FormField>
          <FormField label="Empfänger E-Mail"><input name="recipientEmail" type="email" className={inputCls} /></FormField>
          <FormField label="Fällig in Tagen"><input name="dueInDays" type="number" defaultValue={14} className={inputCls} /></FormField>
          <FormField label="Beschreibung"><input name="description" required className={inputCls} /></FormField>
          <FormField label="Menge"><input name="qty" type="number" defaultValue={1} className={inputCls} /></FormField>
          <FormField label="Einzelpreis netto"><input name="unitPrice" placeholder="100,00" required className={inputCls} /></FormField>
          <FormField label="USt %">
            <select name="vatRate" defaultValue={2000} className={inputCls}>
              <option value={0}>0%</option>
              <option value={1000}>10%</option>
              <option value={1300}>13%</option>
              <option value={2000}>20%</option>
            </select>
          </FormField>
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
