import type { Types } from "mongoose";
import { Product, Service } from "../models/catalog.js";
import { Expense, Invoice } from "../models/finance.js";
import { Business } from "../models/Business.js";
import {
  DiscountRule,
  Payment,
  RegisterSession,
  Return,
  Sale,
} from "../models/sales.js";
import { CommissionEntry } from "../models/appointments.js";
import { PerformanceMetric } from "../models/hr.js";
import { majorToMinor } from "../utils/money.js";

function scale(n: number) {
  return majorToMinor(n);
}

/** Scale legacy major-unit amounts to minor units. Only when flag is explicitly false. */
export async function migrateBusinessToMinorStorage(businessId: Types.ObjectId): Promise<void> {
  const business = await Business.findById(businessId);
  if (!business || business.monetaryStorageMinor !== false) return;

  const products = await Product.find({ businessId });
  for (const p of products) {
    p.price = scale(p.price);
    p.cost = scale(p.cost);
    if (p.discountType === "FIXED" && p.discountValue) {
      p.discountValue = scale(p.discountValue);
    }
    await p.save();
  }

  const services = await Service.find({ businessId });
  for (const s of services) {
    s.price = scale(s.price);
    await s.save();
  }

  const sales = await Sale.find({ businessId });
  for (const sale of sales) {
    sale.subtotal = scale(sale.subtotal);
    sale.discountTotal = scale(sale.discountTotal);
    sale.taxTotal = scale(sale.taxTotal);
    sale.total = scale(sale.total);
    sale.lines = sale.lines.map((line) => ({
      ...line,
      unitPrice: scale(line.unitPrice),
      discountAmount: scale(line.discountAmount),
      lineTotal: scale(line.lineTotal),
    }));
    await sale.save();
  }

  const payments = await Payment.find({ businessId });
  for (const pay of payments) {
    pay.amount = scale(pay.amount);
    await pay.save();
  }

  const returns = await Return.find({ businessId });
  for (const ret of returns) {
    ret.totalRefund = scale(ret.totalRefund);
    ret.lines = ret.lines.map((line) => ({
      ...line,
      refundAmount: scale(line.refundAmount),
    }));
    await ret.save();
  }

  const sessions = await RegisterSession.find({ businessId });
  for (const session of sessions) {
    session.openingFloat = scale(session.openingFloat);
    if (session.closingAmount != null) session.closingAmount = scale(session.closingAmount);
    await session.save();
  }

  const rules = await DiscountRule.find({ businessId, type: "FIXED" });
  for (const rule of rules) {
    rule.value = scale(rule.value);
    await rule.save();
  }

  const expenses = await Expense.find({ businessId });
  for (const e of expenses) {
    e.amount = scale(e.amount);
    await e.save();
  }

  const invoices = await Invoice.find({ businessId });
  for (const inv of invoices) {
    inv.total = scale(inv.total);
    await inv.save();
  }

  const metrics = await PerformanceMetric.find({ businessId });
  for (const m of metrics) {
    m.salesTotal = scale(m.salesTotal);
    await m.save();
  }

  const commissions = await CommissionEntry.find({ businessId });
  for (const c of commissions) {
    c.amount = scale(c.amount);
    await c.save();
  }

  business.monetaryStorageMinor = true;
  await business.save();
}
