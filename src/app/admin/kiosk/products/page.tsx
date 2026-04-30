import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { authedAdmin } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { fmtMoney, parseMoney } from "@/lib/money";

async function createProduct(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const t = ctx.tenant;
  await db.product.create({
    data: {
      tenantId: t.id,
      sku: String(formData.get("sku") ?? "") || null,
      name: String(formData.get("name")),
      category: String(formData.get("category") ?? "") || null,
      price: parseMoney(String(formData.get("price"))),
      cost: parseMoney(String(formData.get("cost") ?? "0")),
      stock: parseInt(String(formData.get("stock") ?? 0)),
      minStock: parseInt(String(formData.get("minStock") ?? 0)),
      vatRate: parseInt(String(formData.get("vatRate") ?? 2000)),
    },
  });
  redirect("/admin/kiosk/products");
}

export default async function Products() {
  const tenant = await requireCurrentTenant();
  const ps = await db.product.findMany({
    where: { tenantId: tenant.id }, orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Kiosk-Produkte" />
      <Table>
        <thead><tr>
          <Th>SKU</Th><Th>Name</Th><Th>Kat.</Th><Th>Preis</Th><Th>Bestand</Th><Th>USt</Th>
        </tr></thead>
        <tbody>
          {ps.map((p) => (
            <tr key={p.id} className={p.stock < p.minStock ? "bg-amber-900/20" : ""}>
              <Td className="font-mono text-xs">{p.sku}</Td>
              <Td>{p.name}</Td>
              <Td>{p.category}</Td>
              <Td>{fmtMoney(p.price)}</Td>
              <Td>{p.stock}</Td>
              <Td className="text-xs">{(p.vatRate / 100).toFixed(0)}%</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neues Produkt</h2>
        <form action={createProduct} className="grid grid-cols-4 gap-3 max-w-3xl">
          <FormField label="SKU"><input name="sku" className={inputCls} /></FormField>
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Kategorie"><input name="category" className={inputCls} /></FormField>
          <FormField label="USt-Satz">
            <select name="vatRate" defaultValue={2000} className={inputCls}>
              <option value={0}>0%</option>
              <option value={1000}>10%</option>
              <option value={2000}>20%</option>
            </select>
          </FormField>
          <FormField label="Verkaufspreis"><input name="price" placeholder="2,80" required className={inputCls} /></FormField>
          <FormField label="Einkaufspreis"><input name="cost" placeholder="1,20" className={inputCls} /></FormField>
          <FormField label="Bestand"><input name="stock" type="number" defaultValue={0} className={inputCls} /></FormField>
          <FormField label="Min Bestand"><input name="minStock" type="number" defaultValue={5} className={inputCls} /></FormField>
          <div className="col-span-4"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
