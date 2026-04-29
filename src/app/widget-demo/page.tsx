import { db } from "@/lib/db";
import Script from "next/script";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WidgetDemo() {
  const tenant = await db.tenant.findFirst({ where: { slug: "greinsfurth" } });

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Banner: das ist eine simulierte fremde Seite */}
      <div className="bg-amber-100 border-b border-amber-200 px-6 py-3 text-sm text-amber-900 flex items-center gap-3 justify-center">
        <span>🎭</span>
        <span>
          Diese Seite simuliert eine fremde WordPress-Vereinsseite. Das Widget unten ist eingebettet.{" "}
          <Link href="/" className="underline font-medium">← Zurueck zur Demo</Link>
        </span>
      </div>

      {/* "WordPress"-Header */}
      <header className="bg-emerald-700 text-white">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-bold">TC Greinsfurth</h1>
          <p className="text-sm opacity-80 mt-1">Tennisclub seit 1972 &middot; Niederösterreich</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <article className="prose">
          <h2 className="text-2xl font-semibold mb-3">Über uns</h2>
          <p className="text-stone-700 leading-relaxed">
            Bestehende Vereinsseite (z.B. WordPress, Joomla, statisches HTML).
            Der Verein will keine neue Website &mdash; nur Online-Reservierung
            einbinden.
          </p>
        </article>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Platz reservieren</h2>
          <div data-kaiman-tennis={tenant?.apiKey ?? "API_KEY"} />
          <p className="text-xs text-stone-500 mt-3">
            ↑ Kaiman-Tennis-Widget, eingebettet via{" "}
            <code className="bg-stone-200 px-1.5 py-0.5 rounded">data-kaiman-tennis</code>{" "}
            Attribut + <code className="bg-stone-200 px-1.5 py-0.5 rounded">script</code> Tag.
          </p>
        </section>

        <section className="bg-stone-900 text-stone-100 rounded-2xl p-6 font-mono text-xs overflow-x-auto">
          <div className="text-stone-400 mb-3">// So einfach ist das Embedding:</div>
          <div className="space-y-1">
            <div>
              <span className="text-rose-300">&lt;div</span>{" "}
              <span className="text-amber-300">data-kaiman-tennis</span>=
              <span className="text-emerald-300">&quot;{tenant?.apiKey?.slice(0, 12) ?? "API_KEY"}...&quot;</span>
              <span className="text-rose-300">&gt;&lt;/div&gt;</span>
            </div>
            <div>
              <span className="text-rose-300">&lt;script</span>{" "}
              <span className="text-amber-300">src</span>=
              <span className="text-emerald-300">&quot;https://kaiman.studio/widget.js&quot;</span>{" "}
              <span className="text-amber-300">async</span>
              <span className="text-rose-300">&gt;&lt;/script&gt;</span>
            </div>
          </div>
        </section>
      </main>

      <Script src="/widget.js" strategy="afterInteractive" />
    </div>
  );
}
