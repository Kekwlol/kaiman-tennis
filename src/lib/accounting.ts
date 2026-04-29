import { db } from "./db";
import { applyVat } from "./money";

// Rechnung anlegen mit Items + automatische Buchungssätze
export async function createInvoice(input: {
  tenantId: string;
  recipientId?: string;
  recipientName: string;
  recipientEmail?: string;
  recipientAddress?: string;
  items: Array<{ description: string; qty: number; unitPriceNet: number; vatRate: number }>;
  dueInDays?: number;
}) {
  let netTotal = 0;
  let vatTotal = 0;
  for (const it of input.items) {
    const lineNet = it.qty * it.unitPriceNet;
    const { vat } = applyVat(lineNet, it.vatRate);
    netTotal += lineNet;
    vatTotal += vat;
  }
  const grossTotal = netTotal + vatTotal;
  const dueDate = new Date(Date.now() + (input.dueInDays ?? 14) * 24 * 3600 * 1000);

  // Nächste Rechnungsnummer
  const year = new Date().getFullYear();
  const last = await db.invoice.findFirst({
    where: { tenantId: input.tenantId, number: { startsWith: `RE-${year}-` } },
    orderBy: { number: "desc" },
  });
  const lastSeq = last ? parseInt(last.number.split("-")[2] || "0") : 0;
  const number = `RE-${year}-${(lastSeq + 1).toString().padStart(4, "0")}`;

  return db.invoice.create({
    data: {
      tenantId: input.tenantId,
      number,
      recipientId: input.recipientId ?? null,
      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail ?? null,
      recipientAddress: input.recipientAddress ?? null,
      itemsJson: JSON.stringify(input.items),
      netTotal,
      vatTotal,
      grossTotal,
      dueDate,
    },
  });
}

// Zahlung buchen + LedgerEntry anlegen
export async function recordPayment(input: {
  tenantId: string;
  invoiceId: string;
  amount: number;
  date?: Date;
  accountCode?: string; // z.B. "2700" = Bank
}) {
  const invoice = await db.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new Error("INVOICE_NOT_FOUND");

  const date = input.date ?? new Date();
  const debitAccount = await ensureAccount(input.tenantId, input.accountCode ?? "2700", "Bank", "asset");
  const creditAccount = await ensureAccount(input.tenantId, "4000", "Erlöse", "revenue");

  await db.$transaction([
    db.ledgerEntry.create({
      data: {
        tenantId: input.tenantId,
        date,
        accountId: debitAccount.id,
        debit: input.amount,
        description: `Zahlung ${invoice.number}`,
        invoiceId: invoice.id,
      },
    }),
    db.ledgerEntry.create({
      data: {
        tenantId: input.tenantId,
        date,
        accountId: creditAccount.id,
        credit: input.amount,
        description: `Erlös ${invoice.number}`,
        invoiceId: invoice.id,
      },
    }),
    db.invoice.update({
      where: { id: invoice.id },
      data: { paid: input.amount >= invoice.grossTotal, paidAt: date },
    }),
  ]);
}

async function ensureAccount(tenantId: string, code: string, name: string, type: string) {
  const exists = await db.account.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (exists) return exists;
  return db.account.create({ data: { tenantId, code, name, type } });
}

// Einnahmen-Ausgaben-Rechnung für ein Jahr
export async function annualReport(tenantId: string, year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const entries = await db.ledgerEntry.findMany({
    where: { tenantId, date: { gte: start, lt: end } },
    include: { account: true },
  });

  const byAccount: Record<string, { name: string; type: string; debit: number; credit: number }> = {};
  for (const e of entries) {
    const k = e.account.code;
    if (!byAccount[k]) {
      byAccount[k] = { name: e.account.name, type: e.account.type, debit: 0, credit: 0 };
    }
    byAccount[k].debit += e.debit;
    byAccount[k].credit += e.credit;
  }

  const revenue = Object.entries(byAccount)
    .filter(([_, a]) => a.type === "revenue")
    .reduce((sum, [_, a]) => sum + a.credit - a.debit, 0);
  const expense = Object.entries(byAccount)
    .filter(([_, a]) => a.type === "expense")
    .reduce((sum, [_, a]) => sum + a.debit - a.credit, 0);

  return {
    year,
    revenue,
    expense,
    profit: revenue - expense,
    accounts: byAccount,
  };
}

// DATEV-CSV-Export (vereinfacht, ohne Prüfziffer)
export async function datevExport(tenantId: string, year: number): Promise<string> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const entries = await db.ledgerEntry.findMany({
    where: { tenantId, date: { gte: start, lt: end } },
    include: { account: true },
    orderBy: { date: "asc" },
  });
  const rows = ["Datum;Belegnr;Konto;Sollkonto;Habenkonto;Betrag;Buchungstext"];
  for (const e of entries) {
    const amt = e.debit > 0 ? e.debit : e.credit;
    rows.push(
      [
        e.date.toISOString().slice(0, 10),
        e.invoiceId ?? "",
        e.account.code,
        e.debit > 0 ? e.account.code : "",
        e.credit > 0 ? e.account.code : "",
        (amt / 100).toFixed(2).replace(".", ","),
        e.description.replace(/;/g, ","),
      ].join(";"),
    );
  }
  return rows.join("\n");
}
