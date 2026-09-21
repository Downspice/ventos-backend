import type { CurrencyCode } from "../constants/currency.js";

/** Ghana pesewas / US cents per major unit */
export const MINOR_PER_MAJOR = 100;

export function majorToMinor(major: number): number {
  if (!Number.isFinite(major)) return 0;
  return Math.round(major * MINOR_PER_MAJOR);
}

export function minorToMajor(minor: number): number {
  if (!Number.isFinite(minor)) return 0;
  return minor / MINOR_PER_MAJOR;
}

/** DB → GraphQL (major units for clients) */
export function fromStoredMoney(stored: number, pricesAreMinor: boolean): number {
  return pricesAreMinor ? minorToMajor(stored) : stored;
}

/** GraphQL → DB */
export function toStoredMoney(major: number, pricesAreMinor: boolean): number {
  return pricesAreMinor ? majorToMinor(major) : major;
}

export function currencySymbol(currency: CurrencyCode): string {
  return currency === "GHS" ? "GH₵" : "$";
}
