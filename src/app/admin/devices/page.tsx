import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";
import { authedAdmin, logMutation } from "@/lib/server-action";
import { z } from "zod";

const DeviceSchema = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(["relay", "mqtt", "exivo", "comydo", "salto", "tedee", "nuki"]),
  endpoint: z.string().url().or(z.literal("")).optional(),
});

async function createDevice(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const parsed = DeviceSchema.parse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    endpoint: formData.get("endpoint") ?? "",
  });
  const created = await db.device.create({
    data: {
      tenantId: ctx.tenant.id,
      name: parsed.name,
      kind: parsed.kind,
      endpoint: parsed.endpoint || null,
    },
  });
  await logMutation(ctx, "Device", created.id, "create", null, parsed);
  redirect("/admin/devices");
}

async function testDevice(formData: FormData) {
  "use server";
  const ctx = await authedAdmin();
  const id = String(formData.get("id"));
  // Tenant-Isolation: Geraet muss zum Tenant gehoeren!
  const device = await db.device.findFirst({
    where: { id, tenantId: ctx.tenant.id },
  });
  if (!device) throw new Error("DEVICE_NOT_FOUND_OR_FORBIDDEN");
  const { executeDevice } = await import("@/lib/devices");
  await executeDevice(id, { action: "on", channel: 0 });
  await logMutation(ctx, "Device", id, "update", null, { action: "test" });
  redirect("/admin/devices");
}

export default async function Devices() {
  await authedAdmin();
  const tenant = await requireCurrentTenant();
  const ds = await db.device.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { mappings: true, logs: true } } },
  });
  const recentLogs = await db.deviceLog.findMany({
    where: { device: { tenantId: tenant.id } },
    orderBy: { createdAt: "desc" }, take: 20,
    include: { device: true },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Hardware-Geräte" desc="Flutlicht / Heizung / Zutritt" />
      <Table>
        <thead><tr>
          <Th>Name</Th><Th>Typ</Th><Th>Endpoint</Th><Th>Mappings</Th><Th>Logs</Th><Th>Status</Th><Th></Th>
        </tr></thead>
        <tbody>
          {ds.map((d) => (
            <tr key={d.id}>
              <Td>{d.name}</Td>
              <Td>{d.kind}</Td>
              <Td className="text-xs font-mono">{d.endpoint ?? "—"}</Td>
              <Td>{d._count.mappings}</Td>
              <Td>{d._count.logs}</Td>
              <Td>{d.active ? "aktiv" : "inaktiv"}</Td>
              <Td>
                <form action={testDevice} className="inline">
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-xs text-emerald-700 hover:text-emerald-900">Test</button>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold mb-4">Neues Gerät</h2>
        <form action={createDevice} className="grid grid-cols-3 gap-3 max-w-3xl">
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Typ">
            <select name="kind" className={inputCls}>
              <option value="relay">Custom Relay</option>
              <option value="mqtt">MQTT</option>
              <option value="exivo">dormakaba Exivo</option>
              <option value="comydo">Comydo</option>
              <option value="salto">Salto</option>
              <option value="tedee">Tedee</option>
              <option value="nuki">Nuki</option>
            </select>
          </FormField>
          <FormField label="Endpoint" hint="URL oder MQTT-Broker"><input name="endpoint" className={inputCls} /></FormField>
          <div className="col-span-3"><Btn type="submit">Anlegen</Btn></div>
        </form>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold mb-4">Letzte Logs</h2>
        <ul className="text-xs font-mono space-y-1">
          {recentLogs.map((l) => (
            <li key={l.id} className="flex gap-3">
              <span className="text-stone-500">{l.createdAt.toLocaleString("de-AT")}</span>
              <span>{l.device.name}</span>
              <span className="text-stone-600">{l.action}</span>
              <span className={l.status === "ok" ? "text-emerald-600" : "text-red-600"}>{l.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
