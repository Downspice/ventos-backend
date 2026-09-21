export const CURRENCY_CODES = ["GHS", "USD"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(value);
}
