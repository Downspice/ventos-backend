export type TaxApplicationMode = "INCLUSIVE" | "EXCLUSIVE";

export type TaxRuleLike = {
  name: string;
  rate: number;
  mode: TaxApplicationMode;
  isActive: boolean;
};

export type ComputedTaxLine = {
  name: string;
  mode: TaxApplicationMode;
  rate: number;
  amount: number;
};

/** Tax amounts in same minor/major units as `taxableSubtotal`. */
export function computeSaleTax(taxableSubtotal: number, rules: TaxRuleLike[]) {
  const active = rules.filter((r) => r.isActive && r.rate > 0);
  let exclusiveTax = 0;
  let inclusiveTax = 0;
  const lines: ComputedTaxLine[] = [];

  for (const rule of active) {
    if (rule.mode === "EXCLUSIVE") {
      const amount = Math.round(taxableSubtotal * (rule.rate / 100));
      exclusiveTax += amount;
      lines.push({ name: rule.name, mode: rule.mode, rate: rule.rate, amount });
    } else {
      const amount = Math.round(taxableSubtotal - taxableSubtotal / (1 + rule.rate / 100));
      inclusiveTax += amount;
      lines.push({ name: rule.name, mode: rule.mode, rate: rule.rate, amount });
    }
  }

  const taxTotal = exclusiveTax + inclusiveTax;
  const total = taxableSubtotal + exclusiveTax;

  return { taxTotal, exclusiveTax, inclusiveTax, lines, total };
}
