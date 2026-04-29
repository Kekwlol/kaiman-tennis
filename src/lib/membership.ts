import { db } from "./db";
import { notify } from "./notifications";

// Beitrag mit Pro-Rata-Berechnung
export function calculateProrationCents(
  fullPriceCents: number,
  validFrom: Date,
  validUntil: Date,
  startsAt: Date,
): number {
  if (startsAt <= validFrom) return fullPriceCents;
  const totalDays = Math.max(1, daysBetween(validFrom, validUntil));
  const remaining = Math.max(0, daysBetween(startsAt, validUntil));
  return Math.round((fullPriceCents * remaining) / totalDays);
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
}

// Mitgliedschaft kaufen + Member-Group setzen
export async function purchaseMembership(input: {
  tenantId: string;
  memberId: string;
  typeId: string;
  validFrom?: Date;
  proratable?: boolean;
}) {
  const type = await db.membershipType.findUnique({ where: { id: input.typeId } });
  if (!type) throw new Error("TYPE_NOT_FOUND");

  const validFrom = input.validFrom ?? new Date();
  const validUntil = new Date(validFrom);
  validUntil.setMonth(validUntil.getMonth() + type.durationMonths);

  const price = (input.proratable ?? type.proratable)
    ? calculateProrationCents(type.fee, validFrom, validUntil, new Date())
    : type.fee;

  const purchase = await db.membershipPurchase.create({
    data: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      typeId: input.typeId,
      validFrom,
      validUntil,
      pricePaid: price,
    },
  });

  await db.member.update({
    where: { id: input.memberId },
    data: { group: type.resultingGroup, status: "active" },
  });

  await notify({
    tenantId: input.tenantId,
    memberId: input.memberId,
    channel: "email",
    template: "membership_purchased",
    subject: `Mitgliedschaft "${type.name}" aktiviert`,
    body: `Deine Mitgliedschaft laeuft bis ${validUntil.toLocaleDateString("de-AT")}.`,
  });

  return purchase;
}

// Saisonueberfuhrung: alle aktiven Mitglieder ohne aktuelle MembershipPurchase
// werden zu Gastspielern, alle anderen behalten ihren Status
export async function seasonRollover(tenantId: string, atDate = new Date()) {
  const members = await db.member.findMany({
    where: { tenantId, status: "active" },
    include: {
      membershipPurchases: {
        where: { validUntil: { gte: atDate }, paid: true },
      },
    },
  });
  const expiredIds = members.filter((m) => m.membershipPurchases.length === 0).map((m) => m.id);
  if (expiredIds.length) {
    await db.member.updateMany({
      where: { id: { in: expiredIds } },
      data: { group: "guest" },
    });
  }
  return { rolled: expiredIds.length };
}

// Mahnwesen
export async function dunning(tenantId: string) {
  const overdue = await db.invoice.findMany({
    where: {
      tenantId,
      paid: false,
      cancelledAt: null,
      dueDate: { lt: new Date() },
    },
  });
  for (const inv of overdue) {
    const daysOverdue = Math.floor((Date.now() - inv.dueDate.getTime()) / (24 * 3600 * 1000));
    let stage = 0;
    if (daysOverdue >= 30) stage = 3;
    else if (daysOverdue >= 14) stage = 2;
    else if (daysOverdue >= 7) stage = 1;
    if (stage === 0) continue;

    await notify({
      tenantId,
      memberId: inv.recipientId ?? null,
      channel: "email",
      template: `dunning_stage_${stage}`,
      subject: `Zahlungserinnerung Stufe ${stage}: Rechnung ${inv.number}`,
      body: `Die Rechnung ${inv.number} ist seit ${daysOverdue} Tagen ueberfällig.`,
      meta: { invoiceId: inv.id, stage },
    });
  }
  return overdue.length;
}
