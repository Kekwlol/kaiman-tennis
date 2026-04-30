import { db } from "./db";
import type { PriceZone, PriceTier } from "@prisma/client";

type ZoneWithTiers = PriceZone & { tiers: PriceTier[] };

// Berechnet einen einzelnen Slot anhand bereits geladener Zones (kein DB-Call!)
export function priceFromZones(
  zones: ZoneWithTiers[],
  input: {
    courtId: string;
    startsAt: Date;
    memberGroup: string;
  },
): number {
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
        if (bestPrice == null || tier.price < bestPrice) bestPrice = tier.price;
      }
    }
  }
  return bestPrice ?? 0;
}

// Convenience-Wrapper: laedt zones + berechnet (1 DB-Call, fuer Single-Slot-Checks)
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
  return priceFromZones(zones, input);
}

// Bulk: alle Zones laden fuer einen Tenant - benutzt dann priceFromZones
export async function loadZones(tenantId: string): Promise<ZoneWithTiers[]> {
  return db.priceZone.findMany({
    where: { tenantId },
    include: { tiers: true },
  });
}
