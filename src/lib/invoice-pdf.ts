// PDF-Generierung fuer Rechnungen — UStG §11 konform fuer Oesterreich
import { fmtMoney } from "./money";
import type { Invoice, Tenant } from "@prisma/client";

type Line = { description: string; qty: number; unitPriceNet: number; vatRate: number };

// Liefert ein PDF-Blob fuer eine Rechnung.
// Verwendet pdfmake zur Generierung.
export async function generateInvoicePdf(invoice: Invoice, tenant: Tenant): Promise<Buffer> {
  const pdfMake = await loadPdfMake();
  const items: Line[] = JSON.parse(invoice.itemsJson || "[]");
  const docDefinition = buildDocDefinition(invoice, tenant, items);
  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBuffer((buf: Buffer) => {
      if (buf) resolve(buf);
      else reject(new Error("PDF-Generation fehlgeschlagen"));
    });
  });
}

async function loadPdfMake(): Promise<{ createPdf: (def: unknown) => { getBuffer: (cb: (b: Buffer) => void) => void } }> {
  // pdfmake server-side
  const pdfMakeMod = await import("pdfmake/build/pdfmake.js");
  const pdfFonts = await import("pdfmake/build/vfs_fonts.js");
  const m = pdfMakeMod as unknown as { default?: { createPdf: (d: unknown) => { getBuffer: (cb: (b: Buffer) => void) => void }; vfs?: unknown } };
  const pdfMake = m.default ?? (m as unknown as { createPdf: (d: unknown) => { getBuffer: (cb: (b: Buffer) => void) => void }; vfs?: unknown });
  const fonts = (pdfFonts as unknown as { default?: { vfs?: unknown }; vfs?: unknown });
  (pdfMake as { vfs?: unknown }).vfs = fonts.default?.vfs ?? fonts.vfs;
  return pdfMake as { createPdf: (def: unknown) => { getBuffer: (cb: (b: Buffer) => void) => void } };
}

function buildDocDefinition(invoice: Invoice, tenant: Tenant, items: Line[]) {
  return {
    content: [
      // Header
      { text: tenant.name, style: "header" },
      tenant.addressLine ? { text: tenant.addressLine, style: "small" } : "",
      tenant.postalCode || tenant.city
        ? { text: `${tenant.postalCode ?? ""} ${tenant.city ?? ""}`, style: "small" }
        : "",
      tenant.vatNumber ? { text: `UID: ${tenant.vatNumber}`, style: "small" } : "",
      tenant.iban ? { text: `IBAN: ${tenant.iban}`, style: "small" } : "",
      { text: "\n" },

      // Title + Number
      {
        columns: [
          { text: "Rechnung", style: "title" },
          {
            stack: [
              { text: `Nr. ${invoice.number}`, alignment: "right", style: "bold" },
              {
                text: `Datum: ${invoice.issuedAt.toLocaleDateString("de-AT")}`,
                alignment: "right",
                style: "small",
              },
              {
                text: `Faellig: ${invoice.dueDate.toLocaleDateString("de-AT")}`,
                alignment: "right",
                style: "small",
              },
            ],
          },
        ],
      },
      { text: "\n" },

      // Recipient
      { text: "Rechnungsempfaenger:", style: "small" },
      { text: invoice.recipientName, style: "bold" },
      invoice.recipientAddress ? { text: invoice.recipientAddress, style: "small" } : "",
      { text: "\n\n" },

      // Items
      {
        table: {
          widths: ["*", 40, 80, 40, 80],
          body: [
            [
              { text: "Beschreibung", style: "tableHeader" },
              { text: "Menge", style: "tableHeader" },
              { text: "Einzel netto", style: "tableHeader", alignment: "right" },
              { text: "USt %", style: "tableHeader", alignment: "right" },
              { text: "Summe netto", style: "tableHeader", alignment: "right" },
            ],
            ...items.map((it) => [
              { text: it.description },
              { text: it.qty.toString(), alignment: "right" },
              { text: fmtMoney(it.unitPriceNet), alignment: "right" },
              { text: `${(it.vatRate / 100).toFixed(0)}%`, alignment: "right" },
              { text: fmtMoney(it.qty * it.unitPriceNet), alignment: "right" },
            ]),
          ],
        },
        layout: "lightHorizontalLines",
      },
      { text: "\n" },

      // Totals
      {
        columns: [
          { text: "" },
          {
            width: 220,
            table: {
              widths: ["*", 80],
              body: [
                [
                  { text: "Summe netto", style: "small" },
                  { text: fmtMoney(invoice.netTotal), alignment: "right", style: "small" },
                ],
                [
                  { text: "USt", style: "small" },
                  { text: fmtMoney(invoice.vatTotal), alignment: "right", style: "small" },
                ],
                [
                  { text: "Gesamt brutto", style: "bold" },
                  { text: fmtMoney(invoice.grossTotal), alignment: "right", style: "bold" },
                ],
              ],
            },
            layout: "noBorders",
          },
        ],
      },

      { text: "\n\n" },
      {
        text: `Bitte ueberweise den Betrag bis ${invoice.dueDate.toLocaleDateString("de-AT")} unter Angabe der Rechnungsnummer ${invoice.number}.`,
        style: "small",
      },
      tenant.iban
        ? { text: `IBAN: ${tenant.iban} — ${tenant.name}`, style: "small" }
        : "",
    ].filter(Boolean),
    styles: {
      header: { fontSize: 18, bold: true, marginBottom: 4 },
      title: { fontSize: 24, bold: true },
      bold: { bold: true },
      small: { fontSize: 9, color: "#555" },
      tableHeader: { bold: true, fillColor: "#f5f5f4", fontSize: 9 },
    },
    defaultStyle: { fontSize: 10 },
  };
}
