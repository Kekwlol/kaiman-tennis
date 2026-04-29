import { db } from "./db";

// Berechne Preis für einen Slot anhand von PriceZone + Tier-Konfiguration
export async function calculatePrice(input: {
  tenantId: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  memberGroup: string;
}): Promise<number> {
  const zones = await db.priceZone.findMany({
    where: { tenantId: input.tenantId },
    include: { tiers: true },
  });

  const dayOfWeek = input.startsAt.getDay();
  const hour = input.startsAt.getHours();
  const dayMask = 1 << dayOfWeek;

  let bestPrice: number | null = null;

  for (const zone of zones) {
    for (const tier of zone.tiers) {
      const courtOk = !tier.courtId || tier.courtId === input.courtId;
      const dayOk = (tier.dayOfWeekMask & dayMask) !== 0;
      const hourOk = hour >= tier.hourFrom && hour < tier.hourTo;
      const groupsRaw = JSON.parse(tier.eligibleGroupsJson || "[]") as string[];
      const groupOk = !groupsRaw.length || groupsRaw.includes(input.memberGroup);

      if (courtOk && dayOk && hourOk && groupOk) {
        const slotPrice = tier.price;
        if (bestPrice == null || slotPrice < bestPrice) bestPrice = slotPrice;
      }
    }
  }

  // Default: kein Tarif greift -> kostenlos (Mitglieder ohne Sondertarif)
  return bestPrice ?? 0;
}
