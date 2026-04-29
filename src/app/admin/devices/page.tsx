import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";

async function createDevice(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  await db.device.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      kind: String(formData.get("kind")),
      endpoint: String(formData.get("endpoint") ?? "") || null,
    },
  });
  redirect("/admin/devices");
}

async function testDevice(formData: FormData) {
  "use server";
  const { executeDevice } = await import("@/lib/devices");
  await executeDevice(String(formData.get("id")), { action: "on", channel: 0 });
  redirect("/admin/devices");
}

export default async function Devices() {
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
                  <button className="text-xs text-[#EEFF00]">Test</button>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neues Gerät</h2>
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

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Letzte Logs</h2>
        <ul className="text-xs font-mono space-y-1">
          {recentLogs.map((l) => (
            <li key={l.id} className="flex gap-3">
              <span className="text-zinc-500">{l.createdAt.toLocaleString("de-AT")}</span>
              <span>{l.device.name}</span>
              <span className="text-zinc-400">{l.action}</span>
              <span className={l.status === "ok" ? "text-emerald-400" : "text-red-400"}>{l.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
