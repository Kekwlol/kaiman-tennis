import { db } from "@/lib/db";
import { getAvailability } from "@/lib/booking";
import { notFound } from "next/navigation";
import { ReservationGrid } from "./grid";
import Link from "next/link";

export default async function Reservation({
  params,
  searchParams,
}: {
  params: Promise<{ ident: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { ident } = await params;
  const { d } = await searchParams;
  const decoded = decodeURIComponent(ident);

  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug: decoded }, { customDomain: decoded }] },
  });
  if (!tenant) notFound();

  const date = d ? new Date(d) : new Date();
  date.setHours(0, 0, 0, 0);
  const slots = await getAvailability(tenant.id, date);

  // Nächste 7 Tage als Quick-Picker
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date();
    dt.setHours(0, 0, 0, 0);
    dt.setDate(dt.getDate() + i);
    return dt;
  });
  const todayKey = new Date();
  todayKey.setHours(0, 0, 0, 0);
  const selectedKey = date.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Platzreservierung</h1>
        <p className="text-stone-500 text-sm mt-1">
          {date.toLocaleDateString("de-AT", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {/* Datums-Picker */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {days.map((dt) => {
          const key = dt.toISOString().slice(0, 10);
          const isActive = key === selectedKey;
          const isToday = dt.getTime() === todayKey.getTime();
          return (
            <Link
              key={key}
              href={`?d=${key}`}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white border border-stone-200 hover:border-stone-300 text-stone-700"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-70 font-medium">
                {dt.toLocaleDateString("de-AT", { weekday: "short" })}
              </div>
              <div className="font-semibold tabular-nums">
                {dt.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })}
              </div>
              {isToday && !isActive && (
                <div className="text-[10px] text-green-600 mt-0.5">Heute</div>
              )}
            </Link>
          );
        })}
      </div>

      <ReservationGrid
        slots={slots.map((s) => ({
          courtId: s.courtId,
          courtName: s.courtName,
          courtCategory: s.courtCategory,
          start: s.start.toISOString(),
          end: s.end.toISOString(),
          available: s.available,
          priceCents: s.priceCents,
          weather: s.weather,
        }))}
        tenantSlug={tenant.slug}
        accent={tenant.primaryColor}
      />
    </div>
  );
}
