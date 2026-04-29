"use client";
import { useState } from "react";
import { fmtMoney } from "@/lib/money";

type Product = { id: string; name: string; price: number; vatRate: number; stock: number; category: string | null };

const CATEGORY_EMOJI: Record<string, string> = {
  "Getraenke": "🥤",
  "Speisen": "🍽️",
  "Equipment": "🎾",
  "Sonstige": "📦",
};

export function RegisterClient({
  tenantSlug: _tenantSlug,
  sessionOpen,
  products,
}: {
  tenantSlug: string;
  sessionOpen: boolean;
  products: Product[];
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const total = products.reduce((sum, p) => sum + (cart[p.id] ?? 0) * p.price, 0);
  const itemCount = Object.values(cart).reduce((s, q) => s + q, 0);

  async function checkout(method: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/kiosk/sale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ productId: id, qty })),
          paymentMethod: method,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCart({});
      setMsg({ kind: "ok", text: `Verkauft! ${fmtMoney(data.total)} (${method})` });
      setTimeout(() => setMsg(null), 3500);
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function adjust(id: string, delta: number) {
    setCart((c) => {
      const next = { ...c };
      const newQty = (next[id] ?? 0) + delta;
      if (newQty <= 0) delete next[id];
      else next[id] = newQty;
      return next;
    });
  }

  const groups = Array.from(new Set(products.map((p) => p.category ?? "Sonstige")));

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {groups.map((g) => (
          <div key={g}>
            <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>{CATEGORY_EMOJI[g] ?? "📦"}</span> {g}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {products
                .filter((p) => (p.category ?? "Sonstige") === g)
                .map((p) => {
                  const inCart = cart[p.id] ?? 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => adjust(p.id, 1)}
                      className={`relative bg-white border rounded-xl p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        inCart > 0 ? "border-stone-900 ring-2 ring-stone-100" : "border-stone-200"
                      }`}
                    >
                      <div className="font-medium leading-tight">{p.name}</div>
                      <div className="text-stone-500 text-sm mt-1 tabular-nums">{fmtMoney(p.price)}</div>
                      {inCart > 0 && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-semibold flex items-center justify-center">
                          {inCart}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <aside className="bg-white border border-stone-200 rounded-2xl p-5 sticky top-4 self-start shadow-sm">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-semibold text-lg">Warenkorb</h3>
          <span className="text-xs text-stone-500">{itemCount} {itemCount === 1 ? "Artikel" : "Artikel"}</span>
        </div>

        {itemCount === 0 ? (
          <p className="text-sm text-stone-400 italic py-8 text-center">
            Klicke ein Produkt um es hinzuzufuegen
          </p>
        ) : (
          <ul className="space-y-2 text-sm mb-4">
            {Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => {
              const p = products.find((x) => x.id === id)!;
              return (
                <li key={id} className="flex items-center justify-between gap-3 bg-stone-50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-stone-500 tabular-nums">{fmtMoney(p.price)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => adjust(id, -1)}
                      className="w-7 h-7 rounded-full bg-white border border-stone-200 hover:border-stone-400 text-sm"
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-semibold tabular-nums">{qty}</span>
                    <button
                      onClick={() => adjust(id, 1)}
                      className="w-7 h-7 rounded-full bg-white border border-stone-200 hover:border-stone-400 text-sm"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-semibold tabular-nums w-16 text-right">{fmtMoney(qty * p.price)}</span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline mb-5">
          <span className="text-stone-600">Total</span>
          <span className="text-2xl font-semibold tabular-nums">{fmtMoney(total)}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => checkout("cash")}
            disabled={busy || total === 0}
            className="px-3 py-3 rounded-xl bg-stone-900 text-white font-medium text-sm hover:bg-stone-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            💶 Bar
          </button>
          <button
            onClick={() => checkout("card")}
            disabled={busy || total === 0}
            className="px-3 py-3 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 font-medium text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            💳 Karte
          </button>
          <button
            onClick={() => checkout("invoice")}
            disabled={busy || total === 0}
            className="px-3 py-3 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 font-medium text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            📋 Rechng.
          </button>
        </div>

        {!sessionOpen && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
            ⚠️ Keine Kassen-Sitzung offen
          </p>
        )}

        {msg && (
          <div
            className={`mt-3 px-3 py-2 rounded-lg text-sm border ${
              msg.kind === "ok"
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            {msg.kind === "ok" ? "✓" : "✕"} {msg.text}
          </div>
        )}
      </aside>
    </div>
  );
}
