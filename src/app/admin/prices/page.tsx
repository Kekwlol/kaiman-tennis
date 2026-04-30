import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls, Card } from "@/components/admin-ui";
import { authedAdmin } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { fmtMoney, parseMoney } from "@/lib/money";

async function createZone(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const t = ctx.tenant;
  await db.priceZone.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      color: String(formData.get("color") ?? "#888"),
      defaultPrice: parseMoney(String(formData.get("defaultPrice") ?? "0")),
    },
  });
  redirect("/admin/prices");
}

async function createTier(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const zoneId = String(formData.get("zoneId"));
  // Zone muss zum Tenant gehoeren
  const zone = await db.priceZone.findFirst({ where: { id: zoneId, tenantId: ctx.tenant.id } });
  if (!zone) throw new Error("ZONE_NOT_FOUND_OR_FORBIDDEN");

  const hourFrom = parseInt(String(formData.get("hourFrom")));
  const hourTo = parseInt(String(formData.get("hourTo")));
  if (isNaN(hourFrom) || isNaN(hourTo) || hourFrom < 0 || hourTo > 24 || hourFrom >= hourTo)
    throw new Error("INVALID_HOURS");

  await db.priceTier.create({
    data: {
      zoneId,
      hourFrom,
      hourTo,
      price: parseMoney(String(formData.get("price"))),
      dayOfWeekMask: parseInt(String(formData.get("dayOfWeekMask") ?? "127")),
      eligibleGroupsJson: JSON.stringify(
        String(formData.get("groups") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      ),
    },
  });
  redirect("/admin/prices");
}

export default async function PricesList() {
  const tenant = await requireCurrentTenant();
  const zones = await db.priceZone.findMany({
    where: { tenantId: tenant.id },
    include: { tiers: true },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Preiszonen" />

      {zones.map((z) => (
        <Card key={z.id} className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-4 h-4" style={{ background: z.color }} />
            <h2 className="font-bold">{z.name}</h2>
            <span className="text-xs text-zinc-500">Default: {fmtMoney(z.defaultPrice)}</span>
          </div>
          <Table>
            <thead><tr>
              <Th>Wochentage</Th><Th>Stunde</Th><Th>Preis</Th><Th>Gruppen</Th>
            </tr></thead>
            <tbody>
              {z.tiers.map((t) => (
                <tr key={t.id}>
                  <Td className="font-mono text-xs">{maskToString(t.dayOfWeekMask)}</Td>
                  <Td>{t.hourFrom}:00 — {t.hourTo}:00</Td>
                  <Td>{fmtMoney(t.price)}</Td>
                  <Td className="text-xs text-zinc-500">{t.eligibleGroupsJson}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <form action={createTier} className="mt-3 grid grid-cols-5 gap-2 items-end text-xs">
            <input type="hidden" name="zoneId" value={z.id} />
            <FormField label="Stunde von"><input name="hourFrom" type="number" defaultValue={8} className={inputCls} /></FormField>
            <FormField label="Stunde bis"><input name="hourTo" type="number" defaultValue={22} className={inputCls} /></FormField>
            <FormField label="Tage Bitmask"><input name="dayOfWeekMask" type="number" defaultValue={127} className={inputCls} /></FormField>
            <FormField label="Preis"><input name="price" placeholder="12,50" className={inputCls} /></FormField>
            <Btn type="submit">+ Tier</Btn>
          </form>
        </Card>
      ))}

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neue Preiszone</h2>
        <form action={createZone} className="grid grid-cols-3 gap-3">
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Farbe"><input name="color" type="color" defaultValue="#EEFF00" className={inputCls} /></FormField>
          <FormField label="Default-Preis"><input name="defaultPrice" placeholder="0,00" className={inputCls} /></FormField>
          <div className="col-span-3"><Btn type="submit">+ Zone</Btn></div>
        </form>
      </div>
    </div>
  );
}

function maskToString(mask: number) {
  const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const out: string[] = [];
  for (let i = 0; i < 7; i++) if ((mask >> i) & 1) out.push(days[i]);
  return out.join(", ");
}
