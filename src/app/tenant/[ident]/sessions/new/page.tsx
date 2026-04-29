import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export default async function NewSession({
  params,
}: {
  params: Promise<{ ident: string }>;
}) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      members: { where: { status: "active" }, orderBy: { name: "asc" } },
      courts: { where: { active: true }, orderBy: { order: "asc" } },
    },
  });
  if (!tenant) notFound();

  async function createSession(formData: FormData) {
    "use server";
    const startsAt = new Date(String(formData.get("startsAt")));
    const endsAt = new Date(startsAt.getTime() + parseInt(String(formData.get("durationMin"))) * 60 * 1000);
    const created = await db.openSession.create({
      data: {
        tenantId: tenant!.id,
        hostId: String(formData.get("hostId")),
        courtId: String(formData.get("courtId") ?? "") || null,
        startsAt,
        endsAt,
        format: String(formData.get("format")),
        skillMin: parseFloat(String(formData.get("skillMin") ?? "0")),
        skillMax: parseFloat(String(formData.get("skillMax") ?? "7")),
        maxPlayers: parseInt(String(formData.get("maxPlayers") ?? "4")),
        description: String(formData.get("description") ?? "") || null,
      },
    });
    redirect(`/sessions/${created.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Neue Open-Play-Session</h1>
        <p className="text-stone-500 mt-2">Lade andere Mitglieder zum Mitspielen ein.</p>
      </header>

      <form action={createSession} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <Field label="Host (du)">
          <select name="hostId" required className={inputCls}>
            {tenant.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Wann?">
            <input name="startsAt" type="datetime-local" required className={inputCls} />
          </Field>
          <Field label="Dauer (Min)">
            <select name="durationMin" defaultValue="90" className={inputCls}>
              <option value="60">60 min</option>
              <option value="90">90 min</option>
              <option value="120">120 min</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Format">
            <select name="format" defaultValue="doubles" className={inputCls}>
              <option value="singles">Einzel (2 Spieler)</option>
              <option value="doubles">Doppel (4 Spieler)</option>
              <option value="mixed">Mixed (4 Spieler)</option>
              <option value="practice">Training (offen)</option>
            </select>
          </Field>
          <Field label="Max. Spieler">
            <input name="maxPlayers" type="number" defaultValue={4} min={2} max={8} className={inputCls} />
          </Field>
        </div>

        <Field label="Platz (optional)">
          <select name="courtId" className={inputCls}>
            <option value="">— wird zugewiesen —</option>
            {tenant.courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Skill von" hint="0 = Anfaenger, 7 = Profi">
            <input name="skillMin" type="number" step="0.5" min={0} max={7} defaultValue={1} className={inputCls} />
          </Field>
          <Field label="Skill bis">
            <input name="skillMax" type="number" step="0.5" min={0} max={7} defaultValue={4} className={inputCls} />
          </Field>
        </div>

        <Field label="Notiz (optional)">
          <textarea
            name="description"
            rows={3}
            placeholder="z.B. Lockeres Match nach der Arbeit"
            className={inputCls}
          />
        </Field>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-stone-900 text-white font-medium shadow-sm hover:bg-stone-700 transition-colors"
          >
            Session erstellen
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 outline-none transition-all";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-stone-600 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-400 mt-1">{hint}</span>}
    </label>
  );
}
