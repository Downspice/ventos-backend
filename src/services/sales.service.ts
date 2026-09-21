import type { Types } from "mongoose";
import { Product } from "../models/catalog.js";
import { PaymentChannel } from "../models/paymentChannel.js";
import { Payment, RegisterSession, Sale, type ISaleLine } from "../models/sales.js";
import { notDeletedFilter } from "../models/shared/documentLifecycle.js";
import { computeSaleTax, type TaxApplicationMode, type TaxRuleLike } from "./tax.service.js";
import { CommissionEntry, CommissionRule } from "../models/appointments.js";
import { CustomerLoyaltyBalance, LoyaltyRule } from "../models/loyalty.js";
import { Notification } from "../models/notifications.js";
import { ActivityFlag, FraudRule } from "../models/compliance.js";
import { badRequest } from "../errors/appError.js";
import { applyStockMovement, getDefaultLocation } from "./inventory.service.js";
import { writeAuditLog } from "./audit.service.js";

function computeLineTotal(line: {
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}): number {
  return Math.max(0, line.quantity * line.unitPrice - line.discountAmount);
}

type SalePaymentMethod = "CASH" | "CARD" | "TRANSFER" | "OTHER" | "BANK" | "MOBILE_MONEY";

function channelFilterForPaymentMethod(method: SalePaymentMethod) {
  switch (method) {
    case "BANK":
    case "CARD":
      return { type: "BANK_ACCOUNT" as const };
    case "MOBILE_MONEY":
      return { type: "MOBILE_MONEY" as const };
    case "TRANSFER":
    case "OTHER":
      return {};
    default:
      return null;
  }
}

async function resolvePaymentChannelId(
  businessId: Types.ObjectId,
  method: SalePaymentMethod,
  paymentChannelId?: string,
): Promise<Types.ObjectId | undefined> {
  if (method === "CASH") {
    if (paymentChannelId) badRequest("Payment channel is not used for cash payments");
    return undefined;
  }

  const channelFilter = channelFilterForPaymentMethod(method);
  if (channelFilter === null) {
    if (paymentChannelId) badRequest("Invalid payment channel");
    return undefined;
  }

  const configuredCount = await PaymentChannel.countDocuments(
    notDeletedFilter({ businessId, ...channelFilter }),
  );
  if (configuredCount === 0) {
    if (paymentChannelId) badRequest("Invalid payment channel");
    return undefined;
  }

  if (!paymentChannelId) badRequest("Payment channel is required for this payment method");

  const channel = await PaymentChannel.findOne(
    notDeletedFilter({ _id: paymentChannelId, businessId, ...channelFilter }),
  );
  if (!channel) badRequest("Invalid payment channel");
  return channel._id;
}

export async function finalizeSale(input: {
  businessId: Types.ObjectId;
  saleId: string;
  payments: {
    method: SalePaymentMethod;
    amount: number;
    reference?: string;
    paymentChannelId?: string;
  }[];
  userId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  ipAddress?: string;
  paymentTolerance?: number;
}) {
  const sale = await Sale.findOne({ _id: input.saleId, businessId: input.businessId });
  if (!sale) badRequest("Sale not found");
  if (sale.status !== "DRAFT") badRequest("Sale is not a draft");

  const paymentTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
  const tolerance = input.paymentTolerance ?? 0.01;
  if (Math.abs(paymentTotal - sale.total) > tolerance) {
    badRequest("Payment total must match sale total");
  }

  if (sale.registerSessionId) {
    const session = await RegisterSession.findById(sale.registerSessionId);
    if (!session || session.status !== "OPEN") badRequest("Register session is not open");
  }

  const defaultLocation = await getDefaultLocation(input.businessId);

  for (const line of sale.lines) {
    if (line.lineType === "PRODUCT" && line.productId) {
      const product = await Product.findById(line.productId);
      if (product?.trackInventory) {
        await applyStockMovement({
          businessId: input.businessId,
          productId: line.productId,
          locationId: defaultLocation._id,
          movementType: "SALE",
          quantityDelta: -line.quantity,
          referenceType: "Sale",
          referenceId: sale._id.toString(),
          userId: input.userId,
          employeeId: input.employeeId,
          ipAddress: input.ipAddress,
        });
      }
    }
  }

  for (const payment of input.payments) {
    const paymentChannelId = await resolvePaymentChannelId(
      input.businessId,
      payment.method,
      payment.paymentChannelId,
    );
    await Payment.create({
      businessId: input.businessId,
      saleId: sale._id,
      method: payment.method,
      amount: payment.amount,
      reference: payment.reference,
      paymentChannelId,
    });
  }

  if (!sale.employeeId && input.employeeId) {
    sale.employeeId = input.employeeId;
  }

  sale.status = "FINALIZED";
  await sale.save();

  await applyCommissions(input.businessId, sale);
  await applyLoyalty(input.businessId, sale);
  await runFraudChecks(input.businessId, sale);

  await writeAuditLog({
    businessId: input.businessId,
    userId: input.userId,
    employeeId: input.employeeId,
    ipAddress: input.ipAddress,
    action: "sale.update",
    entityType: "Sale",
    entityId: sale._id.toString(),
    metadata: { status: "FINALIZED", total: sale.total },
  });

  return sale;
}

async function applyCommissions(businessId: Types.ObjectId, sale: InstanceType<typeof Sale>) {
  if (!sale.employeeId) return;
  const rules = await CommissionRule.find({ businessId, isActive: true });
  if (rules.length === 0) return;

  const rule = rules[0];
  const amount = (sale.total * rule.percent) / 100;
  await CommissionEntry.create({
    businessId,
    employeeId: sale.employeeId,
    saleId: sale._id,
    amount,
  });
}

async function applyLoyalty(businessId: Types.ObjectId, sale: InstanceType<typeof Sale>) {
  if (!sale.customerId) return;
  const rule = await LoyaltyRule.findOne({ businessId, isActive: true });
  if (!rule) return;

  const points = Math.floor(sale.total * rule.pointsPerCurrency);
  await CustomerLoyaltyBalance.findOneAndUpdate(
    { businessId, customerId: sale.customerId },
    { $inc: { points } },
    { upsert: true, new: true },
  );
}

async function runFraudChecks(businessId: Types.ObjectId, sale: InstanceType<typeof Sale>) {
  const rules = await FraudRule.find({ businessId, isActive: true });
  for (const rule of rules) {
    if (rule.ruleType === "LARGE_DISCOUNT" && sale.discountTotal >= rule.threshold) {
      await ActivityFlag.create({
        businessId,
        ruleId: rule._id,
        severity: "MEDIUM",
        message: `Large discount on sale ${sale._id.toString()}`,
        metadata: { discountTotal: sale.discountTotal, threshold: rule.threshold },
      });
      await Notification.create({
        businessId,
        title: "Fraud alert",
        body: `Large discount detected on sale ${sale._id.toString()}`,
      });
    }
  }
}

export function buildSaleTotals(lines: ISaleLine[], taxRules: TaxRuleLike[] = []) {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discountTotal = lines.reduce((sum, l) => sum + l.discountAmount, 0);
  const tax = computeSaleTax(subtotal, taxRules);
  return { subtotal, discountTotal, taxTotal: tax.taxTotal, total: tax.total };
}

export type { TaxApplicationMode, TaxRuleLike };
export { computeSaleTax };

export { computeLineTotal };

export async function createReturn(input: {
  businessId: Types.ObjectId;
  saleId: string;
  lines: { productId: string; quantity: number; refundAmount: number }[];
  reason?: string;
  kind?: "RETURN" | "REFUND";
  stockDisposition?: "RESTOCK" | "WASTE";
  userId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  ipAddress?: string;
}) {
  const sale = await Sale.findOne({ _id: input.saleId, businessId: input.businessId, status: "FINALIZED" });
  if (!sale) badRequest("Sale not found or not finalized");
  if (!input.lines.length) badRequest("At least one return line is required");

  const kind = input.kind ?? "RETURN";
  const stockDisposition = input.stockDisposition ?? "RESTOCK";
  if (kind === "REFUND" && stockDisposition === "WASTE") {
    badRequest("Stock disposition does not apply to refunds");
  }

  for (const line of input.lines) {
    const saleLine = sale.lines.find(
      (sl) => sl.productId?.toString() === line.productId && sl.lineType === "PRODUCT",
    );
    if (!saleLine) badRequest("Product was not on this sale");
    if (line.quantity < 1 || line.quantity > saleLine.quantity) {
      badRequest("Return quantity exceeds quantity sold");
    }
    if (line.refundAmount < 0) badRequest("Refund amount cannot be negative");
  }

  const defaultLocation = await getDefaultLocation(input.businessId);
  const totalRefund = input.lines.reduce((s, l) => s + l.refundAmount, 0);

  const { Return } = await import("../models/sales.js");
  const { Product } = await import("../models/catalog.js");
  const ret = await Return.create({
    businessId: input.businessId,
    saleId: sale._id,
    lines: input.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      refundAmount: l.refundAmount,
    })),
    totalRefund,
    kind,
    stockDisposition: kind === "RETURN" ? stockDisposition : "RESTOCK",
    reason: input.reason,
  });

  if (kind === "RETURN" && stockDisposition === "RESTOCK") {
    for (const line of input.lines) {
      const product = await Product.findOne({
        _id: line.productId,
        businessId: input.businessId,
      });
      if (!product?.trackInventory) continue;
      await applyStockMovement({
        businessId: input.businessId,
        productId: line.productId as unknown as Types.ObjectId,
        locationId: defaultLocation._id,
        movementType: "RETURN",
        quantityDelta: line.quantity,
        referenceType: "Return",
        referenceId: ret._id.toString(),
        userId: input.userId,
        employeeId: input.employeeId,
        ipAddress: input.ipAddress,
      });
    }
  }

  await writeAuditLog({
    businessId: input.businessId,
    userId: input.userId,
    employeeId: input.employeeId,
    ipAddress: input.ipAddress,
    action: "returnrecord.create",
    entityType: "ReturnRecord",
    entityId: ret._id.toString(),
    metadata: { saleId: input.saleId, totalRefund },
  });

  return ret;
}
