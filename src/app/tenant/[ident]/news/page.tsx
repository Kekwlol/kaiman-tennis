import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PublicNews({ params }: { params: Promise<{ ident: string }> }) {
  const { ident } = await params;
  const decoded = decodeURIComponent(ident);
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
    include: {
      newsItems: { orderBy: { publishedAt: "desc" }, take: 20 },
    },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Aktuelles</h1>
        <p className="text-stone-500 mt-2">News rund um den Verein</p>
      </header>

      <div className="space-y-5">
        {tenant.newsItems.map((n) => (
          <article key={n.id} className="bg-white border border-stone-200 rounded-2xl p-7 shadow-sm">
            <time className="text-xs text-stone-500 font-medium">
              {n.publishedAt.toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })}
            </time>
            <h2 className="text-2xl font-semibold mt-2 mb-3">{n.title}</h2>
            <p className="text-stone-700 whitespace-pre-line leading-relaxed">{n.body}</p>
          </article>
        ))}
        {tenant.newsItems.length === 0 && (
          <p className="text-stone-500 italic">Keine News.</p>
        )}
      </div>
    </div>
  );
}
