import type { ReceiptPayload } from "../services/receipt.service.js";

/** Browser thermal printers typically consume HTML or ESC/POS via a native bridge. */
export function buildEscPosStub(receipt: ReceiptPayload): string {
  const lines = [
    "\x1B\x40",
    `${receipt.businessName}\n`,
    `Sale: ${receipt.saleId.slice(-8)}\n`,
    ...(receipt.soldByName ? [`Sold by: ${receipt.soldByName}\n`] : []),
    ...receipt.lines.map((l) => `${l.name} x${l.quantity} ${l.lineTotal.toFixed(2)}\n`),
    `Total: ${receipt.total.toFixed(2)}\n`,
    "\x1D\x56\x00",
  ];
  return lines.join("");
}
