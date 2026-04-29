import { db } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant-context";
import { PageHeader, Btn, Table, Th, Td, FormField, inputCls } from "@/components/admin-ui";
import { redirect } from "next/navigation";

async function createRule(formData: FormData) {
  "use server";
  const h = await import("next/headers").then((m) => m.headers());
  const slug = (await h).get("x-tenant-slug");
  const t = await db.tenant.findUnique({ where: { slug: slug ?? "" } });
  if (!t) throw new Error("NO_TENANT");
  const groups = String(formData.get("groups") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  await db.bookingRule.create({
    data: {
      tenantId: t.id,
      name: String(formData.get("name")),
      scopeJson: JSON.stringify({ groups }),
      maxPerWeek: numOrNull(formData.get("maxPerWeek")),
      maxOpenBookings: numOrNull(formData.get("maxOpenBookings")),
      minAdvanceHours: numOrNull(formData.get("minAdvanceHours")) ?? 0,
      maxAdvanceDays: numOrNull(formData.get("maxAdvanceDays")) ?? 14,
      cancelDeadlineHours: numOrNull(formData.get("cancelDeadlineHours")) ?? 24,
      minDurationMinutes: numOrNull(formData.get("minDurationMinutes")) ?? 60,
      maxDurationMinutes: numOrNull(formData.get("maxDurationMinutes")) ?? 120,
    },
  });
  redirect("/admin/rules");
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (!v) return null;
  const n = parseInt(String(v));
  return isNaN(n) ? null : n;
}

async function deleteRule(formData: FormData) {
  "use server";
  await db.bookingRule.delete({ where: { id: String(formData.get("id")) } });
  redirect("/admin/rules");
}

export default async function RulesList() {
  const tenant = await requireCurrentTenant();
  const rules = await db.bookingRule.findMany({ where: { tenantId: tenant.id } });
  return (
    <div className="space-y-8">
      <PageHeader title="Buchungsregeln" desc="Pro Gruppe / Platz / Tag definierbar" />
      <Table>
        <thead><tr>
          <Th>Name</Th><Th>Scope</Th><Th>Max/Woche</Th><Th>Max offen</Th><Th>Vorlauf</Th><Th>Storno-Deadline</Th><Th></Th>
        </tr></thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id}>
              <Td>{r.name}</Td>
              <Td className="text-xs text-zinc-500">{r.scopeJson}</Td>
              <Td>{r.maxPerWeek ?? "—"}</Td>
              <Td>{r.maxOpenBookings ?? "—"}</Td>
              <Td>{r.minAdvanceHours}h / {r.maxAdvanceDays}d</Td>
              <Td>{r.cancelDeadlineHours}h</Td>
              <Td>
                <form action={deleteRule} className="inline">
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs text-red-400">Löschen</button>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="border border-zinc-800 p-5">
        <h2 className="font-bold mb-4">Neue Regel</h2>
        <form action={createRule} className="grid grid-cols-2 gap-3 max-w-2xl">
          <FormField label="Name"><input name="name" required className={inputCls} /></FormField>
          <FormField label="Gruppen (komma-separiert)" hint="z.B. adult,senior — leer = alle">
            <input name="groups" className={inputCls} />
          </FormField>
          <FormField label="Max Buchungen/Woche"><input name="maxPerWeek" type="number" className={inputCls} /></FormField>
          <FormField label="Max gleichzeitig offene"><input name="maxOpenBookings" type="number" className={inputCls} /></FormField>
          <FormField label="Min Vorlauf (Std)"><input name="minAdvanceHours" type="number" defaultValue={0} className={inputCls} /></FormField>
          <FormField label="Max Vorlauf (Tage)"><input name="maxAdvanceDays" type="number" defaultValue={14} className={inputCls} /></FormField>
          <FormField label="Storno-Deadline (Std)"><input name="cancelDeadlineHours" type="number" defaultValue={24} className={inputCls} /></FormField>
          <FormField label="Min Dauer (Min)"><input name="minDurationMinutes" type="number" defaultValue={60} className={inputCls} /></FormField>
          <div className="col-span-2"><Btn type="submit">+ Anlegen</Btn></div>
        </form>
      </div>
    </div>
  );
}
