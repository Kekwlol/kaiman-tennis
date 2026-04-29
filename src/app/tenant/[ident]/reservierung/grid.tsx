"use client";
import { useState, useTransition } from "react";

type SlotData = {
  courtId: string;
  courtName: string;
  courtCategory: string;
  start: string;
  end: string;
  available: boolean;
  priceCents: number;
  weather?: { emoji: string; tempC: number; precipMm: number };
};

type Block = { courtId: string; courtName: string; start: string; end: string; priceCents: number };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function groupBlocks(slots: SlotData[]): Block[] {
  const byCourt = new Map<string, SlotData[]>();
  for (const s of slots) {
    if (!byCourt.has(s.courtId)) byCourt.set(s.courtId, []);
    byCourt.get(s.courtId)!.push(s);
  }
  const blocks: Block[] = [];
  for (const [, arr] of byCourt) {
    arr.sort((a, b) => a.start.localeCompare(b.start));
    let block: SlotData[] = [];
    for (const s of arr) {
      if (block.length === 0 || block[block.length - 1].end === s.start) {
        block.push(s);
      } else {
        blocks.push(blockFrom(block));
        block = [s];
      }
    }
    if (block.length) blocks.push(blockFrom(block));
  }
  return blocks;
}

function blockFrom(slots: SlotData[]): Block {
  return {
    courtId: slots[0].courtId,
    courtName: slots[0].courtName,
    start: slots[0].start,
    end: slots[slots.length - 1].end,
    priceCents: slots.reduce((sum, s) => sum + s.priceCents, 0),
  };
}

export function ReservationGrid({
  slots,
  tenantSlug,
  accent,
}: {
  slots: SlotData[];
  tenantSlug: string;
  accent: string;
}) {
  const courts = Array.from(new Map(slots.map((s) => [s.courtId, s.courtName])).entries());
  const hours = Array.from(new Set(slots.map((s) => s.start))).sort();
  // Wetter pro Stunde (von Outdoor-Plaetzen, alle gleicher Tenant -> gleiche Werte)
  const weatherByHour = new Map<string, NonNullable<SlotData["weather"]>>();
  for (const s of slots) {
    if (s.weather && !weatherByHour.has(s.start)) weatherByHour.set(s.start, s.weather);
  }
  const showWeather = weatherByHour.size > 0;

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const keyOf = (s: SlotData) => `${s.courtId}|${s.start}`;
  const selectedSlots = slots.filter((s) => selectedKeys.has(keyOf(s)));
  const blocks = groupBlocks(selectedSlots);
  const totalCents = blocks.reduce((sum, b) => sum + b.priceCents, 0);

  function toggle(s: SlotData) {
    if (!s.available) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const k = keyOf(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
    setMsg(null);
  }

  function clearSelection() {
    setSelectedKeys(new Set());
    setMsg(null);
  }

  function submit() {
    if (blocks.length === 0 || !name) return;
    start(async () => {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          guestName: name,
          blocks: blocks.map((b) => ({ courtId: b.courtId, start: b.start, end: b.end })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "unbekannt" });
        return;
      }
      setMsg({
        kind: "ok",
        text: `${data.bookings.length} Buchung(en) erfolgreich. PIN${data.bookings.length > 1 ? "s" : ""}: ${data.bookings.map((b: { pinCode: string }) => b.pinCode).join(", ")}`,
      });
      setSelectedKeys(new Set());
      setName("");
      setTimeout(() => location.reload(), 2500);
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex items-start gap-3">
        <span className="text-lg leading-none">💡</span>
        <span>
          <strong>Tipp:</strong> Klicke mehrere Slots für eine längere Buchung
          oder mehrere Plätze gleichzeitig. Aufeinanderfolgende Slots werden
          automatisch zu einer Buchung zusammengefasst.
        </span>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-4 py-3 text-stone-500 text-xs uppercase tracking-wider font-medium w-20">Zeit</th>
                {courts.map(([id, name]) => (
                  <th key={id} className="text-left px-3 py-3 font-semibold text-stone-800">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => {
                const w = weatherByHour.get(hour);
                return (
                <tr key={hour} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-1.5 text-stone-500 font-mono text-xs tabular-nums">
                    <div className="flex items-center justify-between gap-2">
                      <span>{fmtTime(hour)}</span>
                      {showWeather && w && (
                        <span className="text-[10px]" title={`${w.tempC.toFixed(0)}°C, ${w.precipMm.toFixed(1)}mm Regen`}>
                          {w.emoji} <span className="text-stone-400">{w.tempC.toFixed(0)}°</span>
                        </span>
                      )}
                    </div>
                  </td>
                  {courts.map(([cId]) => {
                    const slot = slots.find((s) => s.courtId === cId && s.start === hour)!;
                    const isSelected = selectedKeys.has(keyOf(slot));
                    return (
                      <td key={cId} className="px-1.5 py-1">
                        <button
                          disabled={!slot.available}
                          onClick={() => toggle(slot)}
                          className={`w-full h-11 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center
                            ${
                              !slot.available
                                ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                                : isSelected
                                ? "shadow-md"
                                : "bg-white border-2 hover:shadow-sm"
                            }`}
                          style={
                            !slot.available
                              ? undefined
                              : isSelected
                              ? { background: accent, color: pickContrast(accent), borderColor: accent, borderWidth: 2 }
                              : { borderColor: `${accent}66` }
                          }
                        >
                          {!slot.available ? (
                            <span className="text-[10px]">belegt</span>
                          ) : isSelected ? (
                            <>
                              <span>✓ gewählt</span>
                              {slot.priceCents > 0 && (
                                <span className="text-[10px] opacity-80">{fmtMoney(slot.priceCents)}</span>
                              )}
                            </>
                          ) : (
                            <>
                              <span style={{ color: accent }}>frei</span>
                              {slot.priceCents > 0 && (
                                <span className="text-[10px] text-stone-500">{fmtMoney(slot.priceCents)}</span>
                              )}
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {blocks.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4 sticky bottom-4">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold">
                {blocks.length === 1 ? "1 Buchung" : `${blocks.length} Buchungen`}
              </h3>
              <p className="text-xs text-stone-500">
                {selectedSlots.length} {selectedSlots.length === 1 ? "Slot" : "Slots"} gewählt
              </p>
            </div>
            <button
              onClick={clearSelection}
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              ✕ Auswahl leeren
            </button>
          </div>

          <ul className="space-y-2">
            {blocks.map((b, i) => (
              <li
                key={i}
                className="flex justify-between items-center bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-1.5 h-8 rounded-full"
                    style={{ background: accent }}
                  />
                  <div>
                    <div className="font-medium">{b.courtName}</div>
                    <div className="text-xs text-stone-500">
                      {fmtTime(b.start)} &mdash; {fmtTime(b.end)}
                    </div>
                  </div>
                </div>
                {b.priceCents > 0 && (
                  <span className="font-semibold tabular-nums">{fmtMoney(b.priceCents)}</span>
                )}
              </li>
            ))}
          </ul>

          {totalCents > 0 && (
            <div className="flex justify-between items-baseline pt-2 border-t border-stone-200">
              <span className="text-stone-600">Total</span>
              <span className="text-2xl font-semibold tabular-nums" style={{ color: accent }}>
                {fmtMoney(totalCents)}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Dein Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 outline-none transition-all"
            />
            <button
              disabled={!name || pending}
              onClick={submit}
              className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              style={{ background: accent, color: pickContrast(accent) }}
            >
              {pending
                ? "Buche..."
                : blocks.length === 1
                ? "Reservieren"
                : `Alle ${blocks.length} reservieren`}
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div
          className={`rounded-xl px-4 py-3 text-sm border ${
            msg.kind === "ok"
              ? "bg-green-50 border-green-200 text-green-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          {msg.kind === "ok" ? "✓" : "✕"} {msg.text}
        </div>
      )}
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
