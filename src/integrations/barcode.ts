import { randomBytes } from "node:crypto";

export function generateEAN13Seed(): string {
  const body = randomBytes(6).toString("hex").slice(0, 12).replace(/\D/g, "0");
  const padded = body.padStart(12, "0").slice(0, 12);
  const check = computeEAN13CheckDigit(padded);
  return `${padded}${check}`;
}

function computeEAN13CheckDigit(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(digits12[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return (10 - (sum % 10)) % 10;
}
