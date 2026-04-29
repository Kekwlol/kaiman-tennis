// Geld immer als Integer-Cent speichern. Anzeige in Euro mit Locale.
export const CENT = 1;
export const EURO = 100;

export function fmtMoney(cents: number, locale = "de-AT", currency = "EUR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function parseMoney(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(",", ".");
  return Math.round(parseFloat(cleaned || "0") * 100);
}

export function applyVat(net: number, vatBasisPoints: number) {
  // vatBasisPoints: 2000 = 20%
  const vat = Math.round((net * vatBasisPoints) / 10000);
  return { net, vat, gross: net + vat };
}

export function reverseVat(gross: number, vatBasisPoints: number) {
  const net = Math.round((gross * 10000) / (10000 + vatBasisPoints));
  return { net, vat: gross - net, gross };
}
