import { Business } from "../models/Business.js";
import { Employee } from "../models/Employee.js";
import { Payment } from "../models/sales.js";
import type { ISale } from "../models/sales.js";
import { fromStoredMoney } from "../utils/money.js";

export type ReceiptPayload = {
  businessName: string;
  saleId: string;
  soldByName: string | null;
  lines: { name: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  payments: { method: string; amount: number }[];
  html: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function buildReceipt(sale: ISale): Promise<ReceiptPayload> {
  const business = await Business.findById(sale.businessId);
  const payments = await Payment.find({ saleId: sale._id });
  const minor = business?.currency === "USD";

  let soldByName: string | null = null;
  if (sale.employeeId) {
    const employee = await Employee.findOne({
      _id: sale.employeeId,
      businessId: sale.businessId,
    });
    if (employee) {
      soldByName = `${employee.firstName} ${employee.lastName}`.trim() || null;
    }
  }

  const lines = sale.lines.map((l) => ({
    name: l.name,
    quantity: l.quantity,
    lineTotal: fromStoredMoney(l.lineTotal, minor),
  }));

  const paymentRows = payments.map((p) => ({
    method: p.method,
    amount: fromStoredMoney(p.amount, minor),
  }));

  const subtotal = fromStoredMoney(sale.subtotal, minor);
  const discountTotal = fromStoredMoney(sale.discountTotal, minor);
  const taxTotal = fromStoredMoney(sale.taxTotal, minor);
  const total = fromStoredMoney(sale.total, minor);

  const soldByHtml = soldByName
    ? `<p>Sold by: ${escapeHtml(soldByName)}</p>`
    : "";

  const html = `<!DOCTYPE html><html><body style="font-family:monospace;width:280px">
<h2>${escapeHtml(business?.name ?? "Ventos")}</h2>
<p>Sale #${sale._id.toString().slice(-8)}</p>
${soldByHtml}
${lines.map((l) => `<div>${escapeHtml(l.name)} x${l.quantity} — ${l.lineTotal.toFixed(2)}</div>`).join("")}
<hr/>
<div>Subtotal: ${subtotal.toFixed(2)}</div>
<div>Discount: ${discountTotal.toFixed(2)}</div>
<div>Tax: ${taxTotal.toFixed(2)}</div>
<strong>Total: ${total.toFixed(2)}</strong>
${paymentRows.map((p) => `<div>${p.method}: ${p.amount.toFixed(2)}</div>`).join("")}
</body></html>`;

  return {
    businessName: business?.name ?? "Ventos",
    saleId: sale._id.toString(),
    soldByName,
    lines,
    subtotal,
    discountTotal,
    taxTotal,
    total,
    payments: paymentRows,
    html,
  };
}
