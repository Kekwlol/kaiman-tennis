import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PublicMatchRequests({
  params,
}: {
  params: Promise<{ ident: string }>;
}) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      matchRequests: {
        where: { status: "open" },
        include: { member: true },
        orderBy: { dateFrom: "asc" },
      },
    },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Spielpartner-Suche</h1>
        <p className="text-stone-500 mt-2">Mitglieder, die einen Spielpartner suchen</p>
      </header>

      <ul className="grid md:grid-cols-2 gap-4">
        {tenant.matchRequests.map((r) => (
          <li
            key={r.id}
            className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: `${tenant.primaryColor}33`,
                    color: tenant.primaryColor === "#EEFF00" ? "#666" : tenant.primaryColor,
                  }}
                >
                  {r.member.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </span>
                <strong className="text-stone-900">{r.member.name}</strong>
              </div>
              <span className="text-xs text-stone-500">Skill {r.member.skillScore}</span>
            </div>
            <div className="text-sm text-stone-700">
              {r.dateFrom.toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              {" — "}
              {r.dateUntil.toLocaleString("de-AT", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-xs text-stone-500 mt-2">
              <span className="px-2 py-0.5 rounded bg-stone-100">{r.matchType}</span>{" "}
              <span className="ml-2">Skill {r.skillMin}-{r.skillMax}</span>
            </div>
          </li>
        ))}
        {tenant.matchRequests.length === 0 && (
          <li className="text-stone-500 italic col-span-2">Keine offenen Anfragen.</li>
        )}
      </ul>
    </div>
  );
}
