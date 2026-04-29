import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { fmtMoney } from "@/lib/money";

export default async function Membership({
  params,
}: {
  params: Promise<{ ident: string }>;
}) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: { membershipTypes: { where: { active: true }, orderBy: { fee: "asc" } } },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Mitglied werden</h1>
        <p className="text-stone-500 mt-2 max-w-2xl">
          Werde Teil unserer Tennis-Community. Wähle die passende Mitgliedschaft.
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tenant.membershipTypes.map((m, i) => (
          <article
            key={m.id}
            className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col ${
              i === 0 ? "border-stone-400 ring-2 ring-stone-100" : "border-stone-200"
            }`}
          >
            <h3 className="font-semibold text-lg mb-1">{m.name}</h3>
            <p className="text-xs text-stone-500 mb-5">
              {m.durationMonths} Monate &middot; {m.resultingGroup}
            </p>
            <div className="text-3xl font-semibold tabular-nums mb-1">{fmtMoney(m.fee)}</div>
            <div className="text-xs text-stone-500 mb-6">
              {m.proratable ? "Pro-rata bei Mid-Season-Eintritt" : "Voller Beitrag"}
            </div>
            <button
              className="mt-auto px-4 py-2.5 rounded-full font-medium text-sm shadow-sm hover:shadow-md transition-all"
              style={{ background: tenant.primaryColor, color: pickContrast(tenant.primaryColor) }}
            >
              Auswählen
            </button>
          </article>
        ))}
        {tenant.membershipTypes.length === 0 && (
          <p className="text-stone-500 italic col-span-full">
            Aktuell keine Mitgliedschaften verfügbar.
          </p>
        )}
      </div>
    </div>
  );
}

function pickContrast(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "#000";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#000" : "#fff";
}
