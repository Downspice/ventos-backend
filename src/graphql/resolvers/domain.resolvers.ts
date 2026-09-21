import { Types } from "mongoose";
import { ALL_PERMISSIONS } from "../../constants/permissions.js";
import { Product, ProductCategory, Service } from "../../models/catalog.js";
import {
  Location,
  StockLevel,
  StockMovement,
  StockTransfer,
} from "../../models/inventory.js";
import { PurchaseOrder, Supplier } from "../../models/procurement.js";
import {
  AttendanceRecord,
  PerformanceMetric,
  Shift,
} from "../../models/hr.js";
import {
  Appointment,
  CommissionEntry,
  CommissionRule,
  StaffServiceAssignment,
} from "../../models/appointments.js";
import { ActivityFlag, FraudRule, SyncQueueItem } from "../../models/compliance.js";
import { Expense, Invoice } from "../../models/finance.js";
import { CustomerLoyaltyBalance, LoyaltyRule } from "../../models/loyalty.js";
import { Notification } from "../../models/notifications.js";
import { AuditLog } from "../../models/AuditLog.js";
import { Business } from "../../models/Business.js";
import {
  PaymentChannel,
  type IPaymentChannel,
  type PaymentChannelType,
} from "../../models/paymentChannel.js";
import { Employee } from "../../models/Employee.js";
import { Role } from "../../models/Role.js";
import {
  CashRegister,
  Customer,
  DiscountRule,
  RegisterSession,
  Sale,
  TaxRule,
} from "../../models/sales.js";
import {
  activatePosEmployee as activatePosEmployeeService,
  deactivatePosEmployee as deactivatePosEmployeeService,
  hashPosPin,
  listPosEmployeeRoster,
} from "../../services/pos.service.js";
import { normalizeAvatarUrl } from "../../services/avatarPresets.service.js";
import { User } from "../../models/User.js";
import { requireAuth, requirePermission } from "../access.js";
import type { GraphQLContext } from "../context.js";
import {
  mapAuditLog,
  mapBusiness,
  mapEmployee,
  mapRole,
  mapSession,
  mapUser,
} from "../mappers.js";
import {
  login,
  logout,
  refreshAccessToken,
  registerBusiness,
  revokeSession,
  listSessions,
} from "../../services/auth.service.js";
import { completeStockTransfer } from "../../services/inventory.service.js";
import { receivePurchaseOrder } from "../../services/procurement.service.js";
import {
  buildSaleTotals,
  computeLineTotal,
  createReturn,
  finalizeSale,
} from "../../services/sales.service.js";
import { buildReceipt } from "../../services/receipt.service.js";
import { generateEAN13Seed } from "../../integrations/barcode.js";
import { buildEscPosStub } from "../../integrations/printer.js";
import { clientIpFromRequest, writeAuditLogFromContext } from "../../services/audit.service.js";
import {
  auditEntityCreate,
  auditEntityUpdate,
  softDeleteDocument,
  stampUpdatedBy,
} from "../../services/documentLifecycle.service.js";
import { notDeletedFilter } from "../../models/shared/documentLifecycle.js";
import { badRequest, forbidden } from "../../errors/appError.js";
import { applyStockMovement } from "../../services/inventory.service.js";
import {
  createMediaAsset,
  deleteMediaAsset,
  linkMediaByUrlToEntity,
  listMediaAssets,
  mapMediaAsset,
  updateMediaAsset,
} from "../../services/media.service.js";
import { MediaAsset } from "../../models/MediaAsset.js";
import { buildEmployeePosDashboard, buildHomeDashboard } from "../../services/dashboard.service.js";
import { ProductMetadataField } from "../../models/ProductMetadataField.js";
import { ProductType } from "../../models/ProductType.js";
import {
  mapMetadataField,
  metadataMapToRecord,
  normalizeProductMetadata,
  seedSuggestedProductMetadataFields,
  slugifyMetadataKey,
  stripMetadataKeyFromProducts,
} from "../../services/productMetadata.service.js";
import {
  assertProductTypeForBusiness,
  deleteProductType,
  listProductTypes,
  mapProductType,
} from "../../services/productType.service.js";
import { isCurrencyCode } from "../../constants/currency.js";
import { migrateBusinessToMinorStorage } from "../../services/moneyMigration.service.js";
import { fromStoredMoney, toStoredMoney } from "../../utils/money.js";

function biz(ctx: GraphQLContext) {
  requireAuth(ctx);
  return ctx.businessId!;
}

/** Minor-unit storage unless the business is explicitly still on legacy major units. */
function pricesMinor(ctx: GraphQLContext): boolean {
  return ctx.business?.monetaryStorageMinor !== false;
}

function mapProductDiscountValue(
  type: string,
  stored: number,
  minor: boolean,
): number {
  if (type === "FIXED") return fromStoredMoney(stored, minor);
  return stored;
}

function storeProductDiscountValue(
  type: string | undefined,
  major: number | undefined,
  minor: boolean,
): number {
  const t = type ?? "NONE";
  if (t === "NONE") return 0;
  if (t === "FIXED") return toStoredMoney(major ?? 0, minor);
  return major ?? 0;
}

function parseProductExpiryDate(value: string | undefined): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(`${value.trim()}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) badRequest("Invalid expiry date");
  return d;
}

type PaymentChannelInputPayload = {
  type: PaymentChannelType;
  name: string;
  accountNumber?: string;
  network?: string;
  number?: string;
};

function mapPaymentChannel(row: IPaymentChannel) {
  return {
    id: row._id.toString(),
    type: row.type,
    name: row.name,
    accountNumber: row.accountNumber ?? null,
    network: row.network ?? null,
    number: row.number ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function normalizePaymentChannelInput(input: PaymentChannelInputPayload) {
  const name = input.name?.trim();
  if (!name) badRequest("Name is required");
  if (input.type === "BANK_ACCOUNT") {
    const accountNumber = input.accountNumber?.trim();
    if (!accountNumber) badRequest("Account number is required for bank accounts");
    return {
      type: "BANK_ACCOUNT" as const,
      name,
      accountNumber,
      network: undefined as string | undefined,
      number: undefined as string | undefined,
    };
  }
  if (input.type === "MOBILE_MONEY") {
    const network = input.network?.trim();
    const number = input.number?.trim();
    if (!network) badRequest("Network is required for mobile money");
    if (!number) badRequest("Mobile number is required for mobile money");
    return {
      type: "MOBILE_MONEY" as const,
      name,
      network,
      number,
      accountNumber: undefined as string | undefined,
    };
  }
  badRequest("Invalid payment channel type");
}

function mapProduct(p: InstanceType<typeof Product>, ctx: GraphQLContext) {
  const minor = pricesMinor(ctx);
  const discountType = p.discountType ?? "NONE";
  return {
    id: p._id.toString(),
    categoryId: p.categoryId?.toString() ?? null,
    productTypeId: p.productTypeId?.toString() ?? null,
    name: p.name,
    sku: p.sku ?? null,
    barcode: p.barcode ?? null,
    price: fromStoredMoney(p.price, minor),
    cost: fromStoredMoney(p.cost, minor),
    trackInventory: p.trackInventory,
    isActive: p.isActive,
    imageUrl: p.imageUrl ?? null,
    metadata: metadataMapToRecord(p.metadata),
    expiryDate: p.expiryDate ? p.expiryDate.toISOString().slice(0, 10) : null,
    discountType,
    discountValue: mapProductDiscountValue(discountType, p.discountValue ?? 0, minor),
    createdAt: p.createdAt.toISOString(),
  };
}

export const domainQueryResolvers = {
  health: () => "ok",
  me: (_: unknown, __: unknown, ctx: GraphQLContext) => (ctx.user ? mapUser(ctx.user) : null),
  myAccess: (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    return {
      permissions: [...ctx.permissions],
    };
  },
  business: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    return mapBusiness(ctx.business!);
  },
  permissionsCatalog: () => ALL_PERMISSIONS,
  sessions: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    const list = await listSessions(ctx.businessId!, ctx.user!._id.toString());
    return list.map(mapSession);
  },
  paymentChannels: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    if (!ctx.permissions.has("settings.read") && !ctx.permissions.has("sales.pos.checkout")) {
      forbidden("Missing permission: settings.read or sales.pos.checkout");
    }
    const rows = await PaymentChannel.find(notDeletedFilter({ businessId: biz(ctx) })).sort({
      createdAt: -1,
    });
    return rows.map(mapPaymentChannel);
  },
  roles: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "roles.read");
    const rows = await Role.find(notDeletedFilter({ businessId: biz(ctx) }));
    return rows.map(mapRole);
  },
  role: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "roles.read");
    const row = await Role.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    return row ? mapRole(row) : null;
  },
  employees: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "employees.read");
    const rows = await Employee.find(notDeletedFilter({ businessId: biz(ctx) })).select("+posPinHash");
    return rows.map(mapEmployee);
  },
  employee: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "employees.read");
    const row = await Employee.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) })).select(
      "+posPinHash",
    );
    return row ? mapEmployee(row) : null;
  },
  auditLogs: async (_: unknown, { limit = 50 }: { limit?: number }, ctx: GraphQLContext) => {
    requirePermission(ctx, "audit.read");
    const rows = await AuditLog.find({ businessId: biz(ctx) }).sort({ createdAt: -1 }).limit(limit);
    return rows.map(mapAuditLog);
  },
  productCategories: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.read");
    const rows = await ProductCategory.find(notDeletedFilter({ businessId: biz(ctx) }));
    return rows.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      description: c.description ?? null,
      parentId: c.parentId?.toString() ?? null,
      createdAt: c.createdAt.toISOString(),
    }));
  },
  productTypes: async (
    _: unknown,
    { includeInactive }: { includeInactive?: boolean },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.read");
    const rows = await listProductTypes(biz(ctx), includeInactive === true);
    return rows.map(mapProductType);
  },
  productMetadataFields: async (
    _: unknown,
    {
      includeInactive,
      productTypeId,
    }: { includeInactive?: boolean; productTypeId?: string },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.read");
    const query: Record<string, unknown> = { businessId: biz(ctx) };
    if (!includeInactive) query.active = { $ne: false };
    if (productTypeId) {
      await assertProductTypeForBusiness(biz(ctx), productTypeId);
      query.productTypeId = new Types.ObjectId(productTypeId);
    }
    const rows = await ProductMetadataField.find(query).sort({ sortOrder: 1, label: 1 });
    return rows.map(mapMetadataField);
  },
  products: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.read");
    const rows = await Product.find(notDeletedFilter({ businessId: biz(ctx) }));
    return rows.map((p) => mapProduct(p, ctx));
  },
  product: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.read");
    const row = await Product.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    return row ? mapProduct(row, ctx) : null;
  },
  locations: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.read");
    const rows = await Location.find({ businessId: biz(ctx) });
    return rows.map((l) => ({
      id: l._id.toString(),
      name: l.name,
      isDefault: l.isDefault,
      createdAt: l.createdAt.toISOString(),
    }));
  },
  stockLevels: async (_: unknown, { locationId }: { locationId?: string }, ctx: GraphQLContext) => {
    requireAuth(ctx);
    if (!ctx.permissions.has("inventory.read") && !ctx.permissions.has("sales.pos.access")) {
      forbidden("Missing permission: inventory.read");
    }
    const filter: Record<string, unknown> = { businessId: biz(ctx) };
    if (locationId) filter.locationId = locationId;
    const rows = await StockLevel.find(filter);
    return rows.map((s) => ({
      id: s._id.toString(),
      productId: s.productId.toString(),
      locationId: s.locationId.toString(),
      quantity: s.quantity,
      updatedAt: s.updatedAt.toISOString(),
    }));
  },
  stockMovements: async (_: unknown, { limit = 100 }: { limit?: number }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.read");
    const rows = await StockMovement.find({ businessId: biz(ctx) }).sort({ createdAt: -1 }).limit(limit);
    return rows.map((m) => ({
      id: m._id.toString(),
      productId: m.productId.toString(),
      locationId: m.locationId.toString(),
      movementType: m.movementType,
      quantityDelta: m.quantityDelta,
      referenceType: m.referenceType ?? null,
      referenceId: m.referenceId ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  },
  stockTransfers: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.read");
    const rows = await StockTransfer.find({ businessId: biz(ctx) });
    return rows.map((t) => ({
      id: t._id.toString(),
      fromLocationId: t.fromLocationId.toString(),
      toLocationId: t.toLocationId.toString(),
      status: t.status,
      lines: t.lines.map((l) => ({ productId: l.productId.toString(), quantity: l.quantity })),
      createdAt: t.createdAt.toISOString(),
    }));
  },
  suppliers: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "purchases.read");
    const rows = await Supplier.find(notDeletedFilter({ businessId: biz(ctx) }));
    return rows.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      email: s.email ?? null,
      phone: s.phone ?? null,
      address: s.address ?? null,
      createdAt: s.createdAt.toISOString(),
    }));
  },
  purchaseOrders: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "purchases.read");
    const rows = await PurchaseOrder.find({ businessId: biz(ctx) });
    return rows.map(mapPurchaseOrder);
  },
  customers: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "customers.read");
    const rows = await Customer.find(notDeletedFilter({ businessId: biz(ctx) }));
    return rows.map(mapCustomer);
  },
  customerPurchaseHistory: async (_: unknown, { customerId }: { customerId: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "customers.read");
    const rows = await Sale.find({ businessId: biz(ctx), customerId, status: "FINALIZED" }).sort({
      createdAt: -1,
    });
    return rows.map((s) => mapSale(s, ctx));
  },
  cashRegisters: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "sales.read");
    const rows = await CashRegister.find({ businessId: biz(ctx) });
    return rows.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      locationId: r.locationId.toString(),
      isActive: r.isActive,
    }));
  },
  openRegisterSessions: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "sales.read");
    const rows = await RegisterSession.find({ businessId: biz(ctx), status: "OPEN" });
    return rows.map((r) => mapRegisterSession(r, ctx));
  },
  registerSession: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "sales.read");
    const row = await RegisterSession.findOne({ _id: id, businessId: biz(ctx) });
    return row ? mapRegisterSession(row, ctx) : null;
  },
  sales: async (_: unknown, { status }: { status?: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "sales.read");
    const filter: Record<string, unknown> = { businessId: biz(ctx) };
    if (status) filter.status = status;
    const rows = await Sale.find(filter).sort({ createdAt: -1 });
    return rows.map((s) => mapSale(s, ctx));
  },
  sale: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "sales.read");
    const row = await Sale.findOne({ _id: id, businessId: biz(ctx) });
    return row ? mapSale(row, ctx) : null;
  },
  discountRules: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "sales.read");
    const rows = await DiscountRule.find({ businessId: biz(ctx) });
    const minor = pricesMinor(ctx);
    return rows.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      type: d.type,
      value: d.type === "FIXED" ? fromStoredMoney(d.value, minor) : d.value,
      isActive: d.isActive,
    }));
  },
  taxRules: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    if (!ctx.permissions.has("sales.read") && !ctx.permissions.has("settings.read")) {
      forbidden("Missing permission: sales.read or settings.read");
    }
    const rows = await TaxRule.find({ businessId: biz(ctx) }).sort({ name: 1 });
    return rows.map(mapTaxRule);
  },
  shifts: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "employees.read");
    const rows = await Shift.find({ businessId: biz(ctx) });
    return rows.map(mapShift);
  },
  attendanceRecords: async (_: unknown, { employeeId }: { employeeId?: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "employees.read");
    const filter: Record<string, unknown> = { businessId: biz(ctx) };
    if (employeeId) filter.employeeId = employeeId;
    const rows = await AttendanceRecord.find(filter).sort({ clockInAt: -1 });
    return rows.map(mapAttendance);
  },
  performanceMetrics: async (_: unknown, { employeeId }: { employeeId?: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "reports.employee.read");
    const filter: Record<string, unknown> = { businessId: biz(ctx) };
    if (employeeId) filter.employeeId = employeeId;
    const rows = await PerformanceMetric.find(filter);
    return rows.map((m) => mapPerformance(m, ctx));
  },
  services: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "appointments.read");
    const rows = await Service.find(notDeletedFilter({ businessId: biz(ctx) }));
    return rows.map((s) => mapService(s, ctx));
  },
  appointments: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "appointments.read");
    const rows = await Appointment.find({ businessId: biz(ctx) });
    return rows.map(mapAppointment);
  },
  staffServiceAssignments: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "appointments.read");
    const rows = await StaffServiceAssignment.find({ businessId: biz(ctx) });
    return rows.map((a) => ({
      id: a._id.toString(),
      employeeId: a.employeeId.toString(),
      serviceId: a.serviceId.toString(),
    }));
  },
  commissionRules: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "employees.read");
    const rows = await CommissionRule.find({ businessId: biz(ctx) });
    return rows.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      percent: r.percent,
      appliesTo: r.appliesTo,
      isActive: r.isActive,
    }));
  },
  commissionEntries: async (_: unknown, { employeeId }: { employeeId?: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "employees.read");
    const filter: Record<string, unknown> = { businessId: biz(ctx) };
    if (employeeId) filter.employeeId = employeeId;
    const rows = await CommissionEntry.find(filter);
    const minor = pricesMinor(ctx);
    return rows.map((e) => ({
      id: e._id.toString(),
      employeeId: e.employeeId.toString(),
      saleId: e.saleId?.toString() ?? null,
      appointmentId: e.appointmentId?.toString() ?? null,
      amount: fromStoredMoney(e.amount, minor),
      createdAt: e.createdAt.toISOString(),
    }));
  },
  expenses: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "reports.financial.read");
    const rows = await Expense.find({ businessId: biz(ctx) });
    const minor = pricesMinor(ctx);
    return rows.map((e) => ({
      id: e._id.toString(),
      category: e.category,
      amount: fromStoredMoney(e.amount, minor),
      description: e.description ?? null,
      incurredAt: e.incurredAt.toISOString(),
    }));
  },
  invoices: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "reports.financial.read");
    const rows = await Invoice.find({ businessId: biz(ctx) });
    const minor = pricesMinor(ctx);
    return rows.map((i) => ({
      id: i._id.toString(),
      invoiceNumber: i.invoiceNumber,
      saleId: i.saleId?.toString() ?? null,
      employeeId: i.employeeId?.toString() ?? null,
      status: i.status,
      total: fromStoredMoney(i.total, minor),
      issuedAt: i.issuedAt?.toISOString() ?? null,
    }));
  },
  loyaltyRules: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "customers.read");
    const rows = await LoyaltyRule.find({ businessId: biz(ctx) });
    return rows.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      pointsPerCurrency: r.pointsPerCurrency,
      isActive: r.isActive,
    }));
  },
  customerLoyaltyBalance: async (_: unknown, { customerId }: { customerId: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "customers.read");
    const row = await CustomerLoyaltyBalance.findOne({ businessId: biz(ctx), customerId });
    if (!row) return null;
    return {
      id: row._id.toString(),
      customerId: row.customerId.toString(),
      points: row.points,
    };
  },
  notifications: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    const rows = await Notification.find({
      businessId: biz(ctx),
      $or: [{ userId: ctx.user!._id }, { userId: { $exists: false } }],
    }).sort({ createdAt: -1 });
    return rows.map(mapNotification);
  },
  fraudRules: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "audit.read");
    const rows = await FraudRule.find({ businessId: biz(ctx) });
    return rows.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      ruleType: r.ruleType,
      threshold: r.threshold,
      isActive: r.isActive,
    }));
  },
  activityFlags: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "audit.read");
    const rows = await ActivityFlag.find({ businessId: biz(ctx) }).sort({ createdAt: -1 });
    return rows.map((f) => ({
      id: f._id.toString(),
      severity: f.severity,
      message: f.message,
      resolvedAt: f.resolvedAt?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
    }));
  },
  dashboardSummary: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    const businessId = biz(ctx);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const salesToday = await Sale.aggregate([
      { $match: { businessId, status: "FINALIZED", createdAt: { $gte: start } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const openRegisterSessions = await RegisterSession.countDocuments({ businessId, status: "OPEN" });
    const lowStock = await StockLevel.countDocuments({ businessId, quantity: { $lte: 5 } });
    const apptStart = new Date();
    const apptEnd = new Date();
    apptEnd.setHours(23, 59, 59, 999);
    const appointmentsToday = await Appointment.countDocuments({
      businessId,
      startAt: { $gte: apptStart, $lte: apptEnd },
    });
    return {
      salesToday: salesToday[0]?.total ?? 0,
      openRegisterSessions,
      lowStockCount: lowStock,
      appointmentsToday,
    };
  },
  homeDashboard: async (
    _: unknown,
    { trendDays = 14 }: { trendDays?: number },
    ctx: GraphQLContext,
  ) => {
    requireAuth(ctx);
    const days = Math.min(Math.max(trendDays ?? 14, 7), 90);
    return buildHomeDashboard(biz(ctx), days, pricesMinor(ctx));
  },
  posStaffDashboard: async (
    _: unknown,
    { trendDays = 14 }: { trendDays?: number },
    ctx: GraphQLContext,
  ) => {
    requireAuth(ctx);
    requirePermission(ctx, "sales.pos.access");
    if (!ctx.employee) badRequest("Sign in as staff to view your stats");
    const days = Math.min(Math.max(trendDays ?? 14, 7), 90);
    const name = `${ctx.employee.firstName} ${ctx.employee.lastName}`.trim() || "Staff";
    return buildEmployeePosDashboard(
      biz(ctx),
      ctx.employee._id,
      name,
      days,
      pricesMinor(ctx),
    );
  },
  salesReport: async (_: unknown, { days = 7 }: { days?: number }, ctx: GraphQLContext) => {
    requirePermission(ctx, "reports.sales.read");
    const since = new Date(Date.now() - days * 86400000);
    const rows = await Sale.aggregate([
      { $match: { businessId: biz(ctx), status: "FINALIZED", createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const minor = pricesMinor(ctx);
    return rows.map((r) => ({
      period: r._id,
      total: fromStoredMoney(r.total, minor),
      count: r.count,
    }));
  },
  inventoryReport: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "reports.inventory.read");
    const levels = await StockLevel.find({ businessId: biz(ctx) });
    const result = [];
    for (const level of levels) {
      const product = await Product.findById(level.productId);
      result.push({
        productId: level.productId.toString(),
        productName: product?.name ?? "Unknown",
        quantity: level.quantity,
      });
    }
    return result;
  },
  employeeReport: async (_: unknown, { days = 30 }: { days?: number }, ctx: GraphQLContext) => {
    requirePermission(ctx, "reports.employee.read");
    const since = new Date(Date.now() - days * 86400000);
    const rows = await PerformanceMetric.find({ businessId: biz(ctx), periodStart: { $gte: since } });
    return rows.map((m) => mapPerformance(m, ctx));
  },
  financialReport: async (_: unknown, { days = 30 }: { days?: number }, ctx: GraphQLContext) => {
    requirePermission(ctx, "reports.financial.read");
    const since = new Date(Date.now() - days * 86400000);
    const sales = await Sale.aggregate([
      { $match: { businessId: biz(ctx), status: "FINALIZED", createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);
    const expenses = await Expense.aggregate([
      { $match: { businessId: biz(ctx), incurredAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const minor = pricesMinor(ctx);
    const salesTotal = fromStoredMoney(sales[0]?.total ?? 0, minor);
    const expenseTotal = fromStoredMoney(expenses[0]?.total ?? 0, minor);
    return {
      period: `${days}d`,
      total: salesTotal - expenseTotal,
      count: sales[0]?.count ?? 0,
    };
  },
  syncQueuePending: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    const rows = await SyncQueueItem.find({
      businessId: biz(ctx),
      userId: ctx.user!._id,
      syncedAt: { $exists: false },
    });
    return rows.map((i) => ({
      id: i._id.toString(),
      entityType: i.entityType,
      entityId: i.entityId,
      operation: i.operation,
      syncedAt: i.syncedAt?.toISOString() ?? null,
    }));
  },
  mediaAssets: async (
    _: unknown,
    args: { entityType?: string | null; entityId?: string | null; search?: string | null },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "media.read");
    return listMediaAssets(new Types.ObjectId(biz(ctx)), args);
  },
  mediaAsset: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "media.read");
    const row = await MediaAsset.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    return row ? mapMediaAsset(row) : null;
  },
  posEmployeeRoster: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    return listPosEmployeeRoster(ctx.businessId);
  },
  posSession: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    return {
      business: ctx.business ? mapBusiness(ctx.business) : null,
      deviceUser: mapUser(ctx.user),
      activeEmployee: ctx.employee ? mapEmployee(ctx.employee) : null,
      permissions: [...ctx.permissions],
    };
  },
};

function mapPurchaseOrder(po: InstanceType<typeof PurchaseOrder>) {
  return {
    id: po._id.toString(),
    supplierId: po.supplierId.toString(),
    locationId: po.locationId.toString(),
    status: po.status,
    lines: po.lines.map((l) => ({
      productId: l.productId.toString(),
      quantityOrdered: l.quantityOrdered,
      quantityReceived: l.quantityReceived,
      unitCost: l.unitCost,
    })),
    createdAt: po.createdAt.toISOString(),
  };
}

function mapCustomer(c: InstanceType<typeof Customer>) {
  return {
    id: c._id.toString(),
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? null,
    phone: c.phone ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

function mapTaxRule(r: InstanceType<typeof TaxRule>) {
  return {
    id: r._id.toString(),
    name: r.name,
    rate: r.rate,
    mode: r.mode,
    isActive: r.isActive,
  };
}

function mapSale(s: InstanceType<typeof Sale>, ctx: GraphQLContext) {
  const minor = pricesMinor(ctx);
  return {
    id: s._id.toString(),
    customerId: s.customerId?.toString() ?? null,
    registerSessionId: s.registerSessionId?.toString() ?? null,
    employeeId: s.employeeId?.toString() ?? null,
    status: s.status,
    lines: s.lines.map((line) => ({
      lineType: line.lineType,
      productId: line.productId?.toString() ?? null,
      serviceId: line.serviceId?.toString() ?? null,
      name: line.name,
      quantity: line.quantity,
      unitPrice: fromStoredMoney(line.unitPrice, minor),
      discountAmount: fromStoredMoney(line.discountAmount, minor),
      lineTotal: fromStoredMoney(line.lineTotal, minor),
    })),
    subtotal: fromStoredMoney(s.subtotal, minor),
    discountTotal: fromStoredMoney(s.discountTotal, minor),
    taxTotal: fromStoredMoney(s.taxTotal, minor),
    total: fromStoredMoney(s.total, minor),
    createdAt: s.createdAt.toISOString(),
  };
}

function mapRegisterSession(r: InstanceType<typeof RegisterSession>, ctx: GraphQLContext) {
  const minor = pricesMinor(ctx);
  return {
    id: r._id.toString(),
    registerId: r.registerId.toString(),
    status: r.status,
    openingFloat: fromStoredMoney(r.openingFloat, minor),
    closingAmount: r.closingAmount != null ? fromStoredMoney(r.closingAmount, minor) : null,
    openedAt: r.openedAt.toISOString(),
    closedAt: r.closedAt?.toISOString() ?? null,
  };
}

function mapShift(s: InstanceType<typeof Shift>) {
  return {
    id: s._id.toString(),
    employeeId: s.employeeId.toString(),
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    notes: s.notes ?? null,
  };
}

function mapAttendance(a: InstanceType<typeof AttendanceRecord>) {
  return {
    id: a._id.toString(),
    employeeId: a.employeeId.toString(),
    clockInAt: a.clockInAt.toISOString(),
    clockOutAt: a.clockOutAt?.toISOString() ?? null,
  };
}

function mapPerformance(p: InstanceType<typeof PerformanceMetric>, ctx: GraphQLContext) {
  const minor = pricesMinor(ctx);
  return {
    id: p._id.toString(),
    employeeId: p.employeeId.toString(),
    periodStart: p.periodStart.toISOString(),
    periodEnd: p.periodEnd.toISOString(),
    salesTotal: fromStoredMoney(p.salesTotal, minor),
    appointmentCount: p.appointmentCount,
  };
}

function mapService(s: InstanceType<typeof Service>, ctx: GraphQLContext) {
  const minor = pricesMinor(ctx);
  return {
    id: s._id.toString(),
    name: s.name,
    description: s.description ?? null,
    durationMinutes: s.durationMinutes,
    price: fromStoredMoney(s.price, minor),
    isActive: s.isActive,
    imageUrl: s.imageUrl ?? null,
  };
}

function mapAppointment(a: InstanceType<typeof Appointment>) {
  return {
    id: a._id.toString(),
    customerId: a.customerId.toString(),
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    status: a.status,
    serviceIds: a.serviceIds.map((id) => id.toString()),
    assignedEmployeeIds: a.assignedEmployeeIds.map((id) => id.toString()),
    notes: a.notes ?? null,
  };
}

function mapNotification(n: InstanceType<typeof Notification>) {
  return {
    id: n._id.toString(),
    title: n.title,
    body: n.body,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

export const domainMutationResolvers = {
  register: async (_: unknown, { input }: { input: Parameters<typeof registerBusiness>[0] }, ctx: GraphQLContext) => {
    const result = await registerBusiness({
      ...input,
      ipAddress: clientIpFromRequest(ctx.req),
    });
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: mapUser(result.user),
      business: mapBusiness(result.business),
    };
  },
  login: async (_: unknown, { input }: { input: Parameters<typeof login>[0] }, ctx: GraphQLContext) => {
    const result = await login({
      ...input,
      ipAddress: clientIpFromRequest(ctx.req),
    });
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: mapUser(result.user),
      business: mapBusiness(result.business),
    };
  },
  refreshToken: async (_: unknown, { refreshToken }: { refreshToken: string }) => {
    return refreshAccessToken(refreshToken);
  },
  activatePosEmployee: async (
    _: unknown,
    { employeeId, password }: { employeeId: string; password: string },
    ctx: GraphQLContext,
  ) => {
    requireAuth(ctx);
    if (!ctx.sessionId) badRequest("No session");
    return activatePosEmployeeService({
      businessId: ctx.businessId,
      sessionId: ctx.sessionId,
      employeeId,
      password,
      userId: ctx.user._id,
      ipAddress: clientIpFromRequest(ctx.req),
    });
  },
  deactivatePosEmployee: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    if (!ctx.sessionId) badRequest("No session");
    return deactivatePosEmployeeService({
      businessId: ctx.businessId,
      sessionId: ctx.sessionId,
      userId: ctx.user._id,
      ipAddress: clientIpFromRequest(ctx.req),
    });
  },
  updateMyProfile: async (
    _: unknown,
    { input }: { input: { name?: string; avatarUrl?: string } },
    ctx: GraphQLContext,
  ) => {
    requireAuth(ctx);
    const user = await User.findById(ctx.user!._id);
    if (!user) badRequest("User not found");
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      user.name = trimmed.length > 0 ? trimmed : undefined;
    }
    if (input.avatarUrl !== undefined) {
      const trimmed = input.avatarUrl.trim();
      user.avatarUrl = trimmed.length > 0 ? normalizeAvatarUrl(trimmed) : undefined;
    }
    await user.save();
    return mapUser(user);
  },
  logout: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    if (ctx.sessionId) {
      await deactivatePosEmployeeService({
        businessId: ctx.businessId,
        sessionId: ctx.sessionId,
        userId: ctx.user._id,
        ipAddress: clientIpFromRequest(ctx.req),
      }).catch(() => undefined);
      await logout(ctx.sessionId, ctx.user!._id.toString());
      await writeAuditLogFromContext(ctx, {
        action: "session.update",
        entityType: "Session",
        entityId: ctx.sessionId,
        metadata: { revoked: true, reason: "logout" },
      });
    }
    return true;
  },
  revokeSession: async (_: unknown, { sessionId }: { sessionId: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "settings.update");
    await revokeSession(sessionId, biz(ctx));
    await writeAuditLogFromContext(ctx, {
      action: "session.update",
      entityType: "Session",
      entityId: sessionId,
      metadata: { revoked: true },
    });
    return true;
  },
  updateBusinessProfile: async (
    _: unknown,
    { input }: { input: Record<string, string | undefined> },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "settings.update");
    let business = await Business.findById(biz(ctx));
    if (!business) badRequest("Business not found");
    if (input.currency !== undefined && !isCurrencyCode(String(input.currency))) {
      badRequest("Invalid currency");
    }
    if (business.monetaryStorageMinor === false) {
      await migrateBusinessToMinorStorage(business._id);
      business = await Business.findById(biz(ctx));
      if (!business) badRequest("Business not found");
    } else if (business.monetaryStorageMinor == null) {
      business.monetaryStorageMinor = true;
    }
    if (input.name !== undefined) business.name = input.name;
    if (input.email !== undefined) business.email = input.email;
    if (input.phone !== undefined) business.phone = input.phone;
    if (input.address !== undefined) business.address = input.address;
    if (input.logoUrl !== undefined) business.logoUrl = input.logoUrl;
    if (input.currency !== undefined) business.currency = input.currency as "GHS" | "USD";
    await business.save();
    await auditEntityUpdate(ctx, "Business", business._id.toString());
    return mapBusiness(business);
  },
  createPaymentChannel: async (
    _: unknown,
    { input }: { input: PaymentChannelInputPayload },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "settings.update");
    const normalized = normalizePaymentChannelInput(input);
    const channel = await PaymentChannel.create({
      businessId: biz(ctx),
      ...normalized,
    });
    await auditEntityCreate(ctx, "PaymentChannel", channel._id.toString());
    return mapPaymentChannel(channel);
  },
  updatePaymentChannel: async (
    _: unknown,
    { id, input }: { id: string; input: PaymentChannelInputPayload },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "settings.update");
    const channel = await PaymentChannel.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!channel) badRequest("Payment channel not found");
    const normalized = normalizePaymentChannelInput(input);
    channel.type = normalized.type;
    channel.name = normalized.name;
    channel.accountNumber = normalized.accountNumber;
    channel.network = normalized.network;
    channel.number = normalized.number;
    await stampUpdatedBy(channel, ctx);
    await channel.save();
    await auditEntityUpdate(ctx, "PaymentChannel", id);
    return mapPaymentChannel(channel);
  },
  deletePaymentChannel: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "settings.update");
    const channel = await PaymentChannel.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!channel) badRequest("Payment channel not found");
    await softDeleteDocument(channel, ctx, "PaymentChannel", id);
    return true;
  },
  createRole: async (_: unknown, { input }: { input: { name: string; description?: string; permissions: string[] } }, ctx: GraphQLContext) => {
    requirePermission(ctx, "roles.create");
    const role = await Role.create({ businessId: biz(ctx), ...input, isSystem: false });
    await auditEntityCreate(ctx, "Role", role._id.toString());
    return mapRole(role);
  },
  updateRole: async (_: unknown, { id, input }: { id: string; input: { name: string; description?: string; permissions: string[] } }, ctx: GraphQLContext) => {
    requirePermission(ctx, "roles.update");
    const role = await Role.findOne(
      notDeletedFilter({ _id: id, businessId: biz(ctx), isSystem: false }),
    );
    if (!role) badRequest("Role not found or system role");
    Object.assign(role, input);
    await stampUpdatedBy(role, ctx);
    await role.save();
    await auditEntityUpdate(ctx, "Role", id);
    return mapRole(role);
  },
  deleteRole: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "roles.delete");
    const role = await Role.findOne(
      notDeletedFilter({ _id: id, businessId: biz(ctx), isSystem: false }),
    );
    if (!role) badRequest("Role not found or system role");
    await softDeleteDocument(role, ctx, "Role", id);
    return true;
  },
  createEmployee: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        avatarUrl?: string;
        roleIds: string[];
        userId?: string;
      };
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "employees.create");
    const avatarUrl =
      input.avatarUrl != null && input.avatarUrl.trim() !== ""
        ? normalizeAvatarUrl(input.avatarUrl)
        : undefined;
    const employee = await Employee.create({
      businessId: biz(ctx),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      avatarUrl,
      roleIds: input.roleIds.map((id) => new Types.ObjectId(id)),
      userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
    });
    await auditEntityCreate(ctx, "Employee", employee._id.toString());
    return mapEmployee(employee);
  },
  updateEmployee: async (
    _: unknown,
    {
      id,
      input,
    }: {
      id: string;
      input: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        avatarUrl?: string;
        roleIds: string[];
        userId?: string;
        posPin?: string;
      };
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "employees.update");
    const employee = await Employee.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) })).select(
      "+posPinHash",
    );
    if (!employee) badRequest("Employee not found");
    employee.firstName = input.firstName;
    employee.lastName = input.lastName;
    employee.email = input.email;
    employee.phone = input.phone;
    if (input.avatarUrl !== undefined) {
      const trimmed = input.avatarUrl.trim();
      employee.avatarUrl = trimmed.length > 0 ? normalizeAvatarUrl(trimmed) : undefined;
    }
    employee.roleIds = input.roleIds.map((rid) => new Types.ObjectId(rid));
    if (input.userId) employee.userId = new Types.ObjectId(input.userId);
    if (input.posPin != null && input.posPin.trim() !== "") {
      employee.posPinHash = await hashPosPin(input.posPin);
    }
    await stampUpdatedBy(employee, ctx);
    await employee.save();
    await auditEntityUpdate(ctx, "Employee", id);
    return mapEmployee(employee);
  },
  deleteEmployee: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "employees.delete");
    const employee = await Employee.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!employee) badRequest("Employee not found");
    await softDeleteDocument(employee, ctx, "Employee", id);
    return true;
  },
  createProductCategory: async (_: unknown, { input }: { input: { name: string; description?: string; parentId?: string } }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.create");
    const cat = await ProductCategory.create({
      businessId: biz(ctx),
      name: input.name,
      description: input.description,
      parentId: input.parentId ? new Types.ObjectId(input.parentId) : undefined,
    });
    await auditEntityCreate(ctx, "ProductCategory", cat._id.toString());
    return {
      id: cat._id.toString(),
      name: cat.name,
      description: cat.description ?? null,
      parentId: cat.parentId?.toString() ?? null,
      createdAt: cat.createdAt.toISOString(),
    };
  },
  createProductType: async (
    _: unknown,
    {
      input,
    }: {
      input: { name: string; description?: string; sortOrder?: number; active?: boolean };
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.update");
    const row = await ProductType.create({
      businessId: biz(ctx),
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
    });
    await auditEntityCreate(ctx, "ProductType", row._id.toString());
    return mapProductType(row);
  },
  updateProductType: async (
    _: unknown,
    {
      id,
      input,
    }: {
      id: string;
      input: { name?: string; description?: string; sortOrder?: number; active?: boolean };
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.update");
    const row = await ProductType.findOne({ _id: id, businessId: biz(ctx) });
    if (!row) badRequest("Product type not found");
    if (input.name !== undefined) row.name = input.name.trim();
    if (input.description !== undefined) row.description = input.description?.trim() || undefined;
    if (input.sortOrder !== undefined) row.sortOrder = input.sortOrder;
    if (input.active !== undefined) row.active = input.active;
    await row.save();
    await auditEntityUpdate(ctx, "ProductType", id);
    return mapProductType(row);
  },
  deleteProductType: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.update");
    await deleteProductType(biz(ctx), id);
    await writeAuditLogFromContext(ctx, {
      action: "producttype.delete",
      entityType: "ProductType",
      entityId: id,
    });
    return true;
  },
  createProductMetadataField: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        productTypeId: string;
        label: string;
        valueType: "TEXT" | "NUMBER" | "SELECT";
        unit?: string;
        options?: string[];
        sortOrder?: number;
        active?: boolean;
      };
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.update");
    const typeRow = await assertProductTypeForBusiness(biz(ctx), input.productTypeId);
    let key = slugifyMetadataKey(input.label);
    const taken = await ProductMetadataField.findOne({
      businessId: biz(ctx),
      productTypeId: typeRow._id,
      key,
    });
    if (taken) {
      key = `${key.slice(0, 28)}_${Date.now().toString(36).slice(-3)}`;
    }
    const options =
      input.valueType === "SELECT"
        ? (input.options ?? []).map((o) => o.trim()).filter(Boolean).slice(0, 40)
        : [];
    const row = await ProductMetadataField.create({
      businessId: biz(ctx),
      productTypeId: typeRow._id,
      key,
      label: input.label.trim(),
      valueType: input.valueType,
      unit: input.unit?.trim() || undefined,
      options,
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
    });
    await auditEntityCreate(ctx, "ProductMetadataField", row._id.toString(), { key: row.key });
    return mapMetadataField(row);
  },
  updateProductMetadataField: async (
    _: unknown,
    {
      id,
      input,
    }: {
      id: string;
      input: {
        label?: string;
        valueType?: "TEXT" | "NUMBER" | "SELECT";
        unit?: string;
        options?: string[];
        sortOrder?: number;
        active?: boolean;
      };
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.update");
    const row = await ProductMetadataField.findOne({ _id: id, businessId: biz(ctx) });
    if (!row) badRequest("Metadata field not found");
    if (input.label !== undefined) row.label = input.label.trim();
    if (input.valueType !== undefined) row.valueType = input.valueType;
    if (input.unit !== undefined) row.unit = input.unit?.trim() || undefined;
    if (input.options !== undefined) {
      row.options =
        row.valueType === "SELECT"
          ? input.options.map((o) => o.trim()).filter(Boolean).slice(0, 40)
          : [];
    }
    if (input.sortOrder !== undefined) row.sortOrder = input.sortOrder;
    if (input.active !== undefined) row.active = input.active;
    await row.save();
    await auditEntityUpdate(ctx, "ProductMetadataField", id);
    return mapMetadataField(row);
  },
  deleteProductMetadataField: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.update");
    const row = await ProductMetadataField.findOne({ _id: id, businessId: biz(ctx) });
    if (!row) badRequest("Metadata field not found");
    const key = row.key;
    await row.deleteOne();
    await stripMetadataKeyFromProducts(biz(ctx), key);
    await writeAuditLogFromContext(ctx, {
      action: "productmetadatafield.delete",
      entityType: "ProductMetadataField",
      entityId: id,
      metadata: { key },
    });
    return true;
  },
  seedProductMetadataFields: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.update");
    const created = await seedSuggestedProductMetadataFields(biz(ctx));
    if (created > 0) {
      await writeAuditLogFromContext(ctx, {
        action: "productmetadatafield.create",
        entityType: "ProductMetadataField",
        metadata: { seeded: true, count: created },
      });
    }
    return created;
  },
  createProduct: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        categoryId?: string;
        productTypeId?: string;
        name: string;
        sku?: string;
        barcode?: string;
        price: number;
        cost?: number;
        trackInventory?: boolean;
        imageUrl?: string;
        metadata?: Record<string, unknown>;
        expiryDate?: string;
        discountType?: string;
        discountValue?: number;
      };
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.create");
    let productTypeOid: Types.ObjectId | undefined;
    if (input.productTypeId) {
      const typeRow = await assertProductTypeForBusiness(biz(ctx), input.productTypeId);
      productTypeOid = typeRow._id;
    }
    const metadata = await normalizeProductMetadata(
      biz(ctx),
      input.metadata as Record<string, unknown> | undefined,
      productTypeOid,
    );
    const minor = pricesMinor(ctx);
    const discountType = (input.discountType ?? "NONE") as "NONE" | "PERCENT" | "FIXED";
    const product = await Product.create({
      businessId: biz(ctx),
      categoryId: input.categoryId ? new Types.ObjectId(input.categoryId) : undefined,
      productTypeId: productTypeOid,
      name: input.name,
      sku: input.sku?.trim() || undefined,
      barcode: input.barcode?.trim() || undefined,
      price: toStoredMoney(input.price, minor),
      cost: toStoredMoney(input.cost ?? 0, minor),
      trackInventory: input.trackInventory ?? true,
      imageUrl: input.imageUrl?.trim() || undefined,
      metadata,
      expiryDate: parseProductExpiryDate(input.expiryDate),
      discountType,
      discountValue: storeProductDiscountValue(
        discountType,
        input.discountValue,
        minor,
      ),
    });
    if (product.imageUrl) {
      await linkMediaByUrlToEntity(
        new Types.ObjectId(biz(ctx)),
        product.imageUrl,
        "PRODUCT",
        product._id.toString(),
      );
    }
    await auditEntityCreate(ctx, "Product", product._id.toString());
    return mapProduct(product, ctx);
  },
  updateProduct: async (
    _: unknown,
    {
      id,
      input,
    }: {
      id: string;
      input: {
        categoryId?: string;
        productTypeId?: string;
        name: string;
        sku?: string;
        barcode?: string;
        price: number;
        cost?: number;
        trackInventory?: boolean;
        imageUrl?: string;
        metadata?: Record<string, unknown>;
        expiryDate?: string;
        discountType?: string;
        discountValue?: number;
      };
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.update");
    const product = await Product.findOne({ _id: id, businessId: biz(ctx) });
    if (!product) badRequest("Product not found");
    if (input.productTypeId !== undefined) {
      if (input.productTypeId) {
        const typeRow = await assertProductTypeForBusiness(biz(ctx), input.productTypeId);
        product.productTypeId = typeRow._id;
      } else {
        product.productTypeId = undefined;
      }
    }
    const metadataTypeId = product.productTypeId ?? null;
    if (input.metadata !== undefined) {
      product.metadata = await normalizeProductMetadata(
        biz(ctx),
        input.metadata as Record<string, unknown>,
        metadataTypeId,
      );
    }
    product.categoryId = input.categoryId
      ? new Types.ObjectId(input.categoryId)
      : product.categoryId;
    product.name = input.name;
    if (input.sku !== undefined) {
      product.sku = input.sku?.trim() || undefined;
    }
    if (input.barcode !== undefined) {
      product.barcode = input.barcode?.trim() || undefined;
    }
    const minor = pricesMinor(ctx);
    product.price = toStoredMoney(input.price, minor);
    product.cost = toStoredMoney(input.cost ?? fromStoredMoney(product.cost, minor), minor);
    product.trackInventory = input.trackInventory ?? product.trackInventory;
    if (input.imageUrl !== undefined) {
      product.imageUrl = input.imageUrl?.trim() || undefined;
    }
    if (input.expiryDate !== undefined) {
      product.expiryDate = parseProductExpiryDate(input.expiryDate);
    }
    if (input.discountType !== undefined) {
      product.discountType = input.discountType as "NONE" | "PERCENT" | "FIXED";
      product.discountValue = storeProductDiscountValue(
        product.discountType,
        input.discountValue,
        minor,
      );
    } else if (input.discountValue !== undefined && product.discountType !== "NONE") {
      product.discountValue = storeProductDiscountValue(
        product.discountType,
        input.discountValue,
        minor,
      );
    }
    await stampUpdatedBy(product, ctx);
    await product.save();
    await auditEntityUpdate(ctx, "Product", id);
    if (product.imageUrl) {
      await linkMediaByUrlToEntity(
        new Types.ObjectId(biz(ctx)),
        product.imageUrl,
        "PRODUCT",
        product._id.toString(),
      );
    }
    return mapProduct(product, ctx);
  },
  deleteProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.delete");
    const product = await Product.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!product) badRequest("Product not found");
    await softDeleteDocument(product, ctx, "Product", id);
    return true;
  },
  generateProductBarcode: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.update");
    const product = await Product.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!product) badRequest("Product not found");
    product.barcode = generateEAN13Seed();
    await stampUpdatedBy(product, ctx);
    await product.save();
    await auditEntityUpdate(ctx, "Product", id, { barcodeGenerated: true });
    return mapProduct(product, ctx);
  },
  createLocation: async (_: unknown, { name, isDefault }: { name: string; isDefault?: boolean }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.create");
    if (isDefault) await Location.updateMany({ businessId: biz(ctx) }, { isDefault: false });
    const loc = await Location.create({ businessId: biz(ctx), name, isDefault: !!isDefault });
    await auditEntityCreate(ctx, "Location", loc._id.toString());
    return {
      id: loc._id.toString(),
      name: loc.name,
      isDefault: loc.isDefault,
      createdAt: loc.createdAt.toISOString(),
    };
  },
  adjustStock: async (
    _: unknown,
    args: { productId: string; locationId: string; quantityDelta: number; notes?: string },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.update");
    const movement = await applyStockMovement({
      businessId: biz(ctx),
      productId: new Types.ObjectId(args.productId),
      locationId: new Types.ObjectId(args.locationId),
      movementType: "ADJUSTMENT",
      quantityDelta: args.quantityDelta,
      notes: args.notes,
      userId: ctx.user!._id,
      employeeId: ctx.employee?._id,
      ipAddress: clientIpFromRequest(ctx.req),
    });
    return {
      id: movement._id.toString(),
      productId: movement.productId.toString(),
      locationId: movement.locationId.toString(),
      movementType: movement.movementType,
      quantityDelta: movement.quantityDelta,
      referenceType: movement.referenceType ?? null,
      referenceId: movement.referenceId ?? null,
      createdAt: movement.createdAt.toISOString(),
    };
  },
  createStockTransfer: async (
    _: unknown,
    args: { fromLocationId: string; toLocationId: string; lines: { productId: string; quantity: number }[] },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "inventory.transfer.create");
    const transfer = await StockTransfer.create({
      businessId: biz(ctx),
      fromLocationId: args.fromLocationId,
      toLocationId: args.toLocationId,
      lines: args.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    });
    await auditEntityCreate(ctx, "StockTransfer", transfer._id.toString());
    return {
      id: transfer._id.toString(),
      fromLocationId: transfer.fromLocationId.toString(),
      toLocationId: transfer.toLocationId.toString(),
      status: transfer.status,
      lines: transfer.lines.map((l) => ({ productId: l.productId.toString(), quantity: l.quantity })),
      createdAt: transfer.createdAt.toISOString(),
    };
  },
  completeStockTransfer: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.transfer.create");
    const transfer = await completeStockTransfer(
      biz(ctx),
      id,
      ctx.user!._id,
      ctx.employee?._id,
      clientIpFromRequest(ctx.req),
    );
    await auditEntityUpdate(ctx, "StockTransfer", id, { status: transfer.status });
    return {
      id: transfer._id.toString(),
      fromLocationId: transfer.fromLocationId.toString(),
      toLocationId: transfer.toLocationId.toString(),
      status: transfer.status,
      lines: transfer.lines.map((l) => ({ productId: l.productId.toString(), quantity: l.quantity })),
      createdAt: transfer.createdAt.toISOString(),
    };
  },
  createSupplier: async (_: unknown, args: Record<string, string | undefined>, ctx: GraphQLContext) => {
    requirePermission(ctx, "purchases.create");
    const supplier = await Supplier.create({ businessId: biz(ctx), ...args });
    await auditEntityCreate(ctx, "Supplier", supplier._id.toString());
    return {
      id: supplier._id.toString(),
      name: supplier.name,
      email: supplier.email ?? null,
      phone: supplier.phone ?? null,
      address: supplier.address ?? null,
      createdAt: supplier.createdAt.toISOString(),
    };
  },
  updateSupplier: async (
    _: unknown,
    { id, input }: { id: string; input: { name: string; email?: string; phone?: string; address?: string } },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "purchases.create");
    const supplier = await Supplier.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!supplier) badRequest("Supplier not found");
    supplier.name = input.name;
    supplier.email = input.email;
    supplier.phone = input.phone;
    supplier.address = input.address;
    await stampUpdatedBy(supplier, ctx);
    await supplier.save();
    await auditEntityUpdate(ctx, "Supplier", id);
    return {
      id: supplier._id.toString(),
      name: supplier.name,
      email: supplier.email ?? null,
      phone: supplier.phone ?? null,
      address: supplier.address ?? null,
      createdAt: supplier.createdAt.toISOString(),
    };
  },
  deleteSupplier: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "purchases.create");
    const supplier = await Supplier.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!supplier) badRequest("Supplier not found");
    await softDeleteDocument(supplier, ctx, "Supplier", id);
    return true;
  },
  createPurchaseOrder: async (
    _: unknown,
    args: { supplierId: string; locationId: string; lines: { productId: string; quantityOrdered: number; unitCost: number }[] },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "purchases.create");
    const po = await PurchaseOrder.create({
      businessId: biz(ctx),
      supplierId: args.supplierId,
      locationId: args.locationId,
      lines: args.lines.map((l) => ({
        productId: l.productId,
        quantityOrdered: l.quantityOrdered,
        quantityReceived: 0,
        unitCost: l.unitCost,
      })),
    });
    await auditEntityCreate(ctx, "PurchaseOrder", po._id.toString());
    return mapPurchaseOrder(po);
  },
  receivePurchaseOrder: async (
    _: unknown,
    args: { id: string; lines: { productId: string; quantity: number }[] },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "purchases.receive");
    const po = await receivePurchaseOrder({
      businessId: biz(ctx),
      purchaseOrderId: args.id,
      lines: args.lines,
      userId: ctx.user!._id,
      employeeId: ctx.employee?._id,
      ipAddress: clientIpFromRequest(ctx.req),
    });
    return mapPurchaseOrder(po);
  },
  createCustomer: async (_: unknown, args: Record<string, string>, ctx: GraphQLContext) => {
    requirePermission(ctx, "customers.create");
    const customer = await Customer.create({ businessId: biz(ctx), ...args });
    await auditEntityCreate(ctx, "Customer", customer._id.toString());
    return mapCustomer(customer);
  },
  updateCustomer: async (
    _: unknown,
    { id, input }: { id: string; input: { firstName: string; lastName: string; email?: string; phone?: string } },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "customers.update");
    const customer = await Customer.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!customer) badRequest("Customer not found");
    customer.firstName = input.firstName;
    customer.lastName = input.lastName;
    customer.email = input.email;
    customer.phone = input.phone;
    await stampUpdatedBy(customer, ctx);
    await customer.save();
    await auditEntityUpdate(ctx, "Customer", id);
    return mapCustomer(customer);
  },
  deleteCustomer: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "customers.delete");
    const customer = await Customer.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!customer) badRequest("Customer not found");
    await softDeleteDocument(customer, ctx, "Customer", id);
    return true;
  },
  createCashRegister: async (_: unknown, args: { name: string; locationId: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "settings.update");
    const register = await CashRegister.create({ businessId: biz(ctx), ...args });
    await auditEntityCreate(ctx, "CashRegister", register._id.toString());
    return {
      id: register._id.toString(),
      name: register.name,
      locationId: register.locationId.toString(),
      isActive: register.isActive,
    };
  },
  openRegisterSession: async (_: unknown, args: { registerId: string; openingFloat?: number }, ctx: GraphQLContext) => {
    requirePermission(ctx, "sales.pos.access");
    if (!ctx.employee) badRequest("Employee profile required");
    const minor = pricesMinor(ctx);
    const session = await RegisterSession.create({
      businessId: biz(ctx),
      registerId: args.registerId,
      openedByEmployeeId: ctx.employee._id,
      openingFloat: toStoredMoney(args.openingFloat ?? 0, minor),
      status: "OPEN",
    });
    await auditEntityCreate(ctx, "RegisterSession", session._id.toString());
    return mapRegisterSession(session, ctx);
  },
  closeRegisterSession: async (_: unknown, args: { id: string; closingAmount: number }, ctx: GraphQLContext) => {
    requirePermission(ctx, "sales.pos.access");
    const session = await RegisterSession.findOne({ _id: args.id, businessId: biz(ctx), status: "OPEN" });
    if (!session) badRequest("Session not found");
    session.status = "CLOSED";
    session.closingAmount = toStoredMoney(args.closingAmount, pricesMinor(ctx));
    session.closedAt = new Date();
    session.closedByEmployeeId = ctx.employee?._id;
    await session.save();
    await auditEntityUpdate(ctx, "RegisterSession", args.id, { status: "CLOSED" });
    return mapRegisterSession(session, ctx);
  },
  createSaleDraft: async (
    _: unknown,
    args: {
      registerSessionId?: string;
      customerId?: string;
      lines: Array<{
        lineType: string;
        productId?: string;
        serviceId?: string;
        name: string;
        quantity: number;
        unitPrice: number;
        discountAmount?: number;
      }>;
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "sales.pos.checkout");
    const minor = pricesMinor(ctx);
    const lines = args.lines.map((l) => {
      const discountAmount = l.discountAmount ?? 0;
      const lineType = l.lineType as "PRODUCT" | "SERVICE";
      const lineTotal = computeLineTotal({
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountAmount,
      });
      return {
        lineType,
        productId: l.productId ? new Types.ObjectId(l.productId) : undefined,
        serviceId: l.serviceId ? new Types.ObjectId(l.serviceId) : undefined,
        name: l.name,
        quantity: l.quantity,
        unitPrice: toStoredMoney(l.unitPrice, minor),
        discountAmount: toStoredMoney(discountAmount, minor),
        lineTotal: toStoredMoney(lineTotal, minor),
      };
    });
    const taxRuleRows = await TaxRule.find({ businessId: biz(ctx) });
    const totals = buildSaleTotals(
      lines,
      taxRuleRows.map((r) => ({
        name: r.name,
        rate: r.rate,
        mode: r.mode,
        isActive: r.isActive,
      })),
    );
    const sale = await Sale.create({
      businessId: biz(ctx),
      registerSessionId: args.registerSessionId,
      customerId: args.customerId,
      employeeId: ctx.employee?._id,
      status: "DRAFT",
      lines,
      ...totals,
    });
    await auditEntityCreate(ctx, "Sale", sale._id.toString(), { status: "DRAFT" });
    return mapSale(sale, ctx);
  },
  finalizeSale: async (
    _: unknown,
    args: {
      id: string;
      payments: { method: string; amount: number; reference?: string; paymentChannelId?: string }[];
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "sales.pos.checkout");
    const minor = pricesMinor(ctx);
    const sale = await finalizeSale({
      businessId: biz(ctx),
      saleId: args.id,
      payments: args.payments.map((p) => ({
        method: p.method as "CASH" | "CARD" | "TRANSFER" | "OTHER" | "BANK" | "MOBILE_MONEY",
        amount: toStoredMoney(p.amount, minor),
        reference: p.reference,
        paymentChannelId: p.paymentChannelId,
      })),
      userId: ctx.user!._id,
      employeeId: ctx.employee?._id,
      ipAddress: clientIpFromRequest(ctx.req),
      paymentTolerance: minor ? 1 : 0.01,
    });
    return mapSale(sale, ctx);
  },
  createReturn: async (
    _: unknown,
    args: {
      saleId: string;
      lines: { productId: string; quantity: number; refundAmount: number }[];
      reason?: string;
      kind?: "RETURN" | "REFUND";
      stockDisposition?: "RESTOCK" | "WASTE";
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "sales.refund.create");
    const minor = pricesMinor(ctx);
    const ret = await createReturn({
      businessId: biz(ctx),
      saleId: args.saleId,
      lines: args.lines.map((l) => ({
        ...l,
        refundAmount: toStoredMoney(l.refundAmount, minor),
      })),
      reason: args.reason,
      kind: args.kind,
      stockDisposition: args.stockDisposition,
      userId: ctx.user!._id,
      employeeId: ctx.employee?._id,
      ipAddress: clientIpFromRequest(ctx.req),
    });
    return {
      id: ret._id.toString(),
      saleId: ret.saleId.toString(),
      totalRefund: fromStoredMoney(ret.totalRefund, minor),
      kind: ret.kind,
      stockDisposition: ret.stockDisposition,
      reason: ret.reason ?? null,
      createdAt: ret.createdAt.toISOString(),
    };
  },
  createDiscountRule: async (
    _: unknown,
    args: { name: string; type: "PERCENT" | "FIXED"; value: number },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "settings.update");
    const minor = pricesMinor(ctx);
    const storedValue = args.type === "FIXED" ? toStoredMoney(args.value, minor) : args.value;
    const rule = await DiscountRule.create({
      businessId: biz(ctx),
      name: args.name,
      type: args.type,
      value: storedValue,
    });
    await auditEntityCreate(ctx, "DiscountRule", rule._id.toString());
    return {
      id: rule._id.toString(),
      name: rule.name,
      type: rule.type,
      value: args.type === "FIXED" ? args.value : rule.value,
      isActive: rule.isActive,
    };
  },
  createTaxRule: async (
    _: unknown,
    { input }: { input: { name: string; rate: number; mode: "INCLUSIVE" | "EXCLUSIVE"; isActive?: boolean } },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "settings.update");
    const rule = await TaxRule.create({
      businessId: biz(ctx),
      name: input.name.trim(),
      rate: input.rate,
      mode: input.mode,
      isActive: input.isActive ?? true,
    });
    await auditEntityCreate(ctx, "TaxRule", rule._id.toString());
    return mapTaxRule(rule);
  },
  updateTaxRule: async (
    _: unknown,
    {
      id,
      input,
    }: {
      id: string;
      input: { name: string; rate: number; mode: "INCLUSIVE" | "EXCLUSIVE"; isActive?: boolean };
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "settings.update");
    const rule = await TaxRule.findOne({ _id: id, businessId: biz(ctx) });
    if (!rule) badRequest("Tax rule not found");
    rule.name = input.name.trim();
    rule.rate = input.rate;
    rule.mode = input.mode;
    if (input.isActive !== undefined) rule.isActive = input.isActive;
    await rule.save();
    await auditEntityUpdate(ctx, "TaxRule", id);
    return mapTaxRule(rule);
  },
  deleteTaxRule: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "settings.update");
    const rule = await TaxRule.findOne({ _id: id, businessId: biz(ctx) });
    if (!rule) badRequest("Tax rule not found");
    await rule.deleteOne();
    await auditEntityUpdate(ctx, "TaxRule", id, { deleted: true });
    return true;
  },
  createShift: async (_: unknown, args: { employeeId: string; startAt: string; endAt: string; notes?: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "employees.update");
    const shift = await Shift.create({
      businessId: biz(ctx),
      employeeId: args.employeeId,
      startAt: new Date(args.startAt),
      endAt: new Date(args.endAt),
      notes: args.notes,
    });
    await auditEntityCreate(ctx, "Shift", shift._id.toString());
    return mapShift(shift);
  },
  clockIn: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    if (!ctx.employee) badRequest("Employee profile required");
    const open = await AttendanceRecord.findOne({
      businessId: biz(ctx),
      employeeId: ctx.employee._id,
      clockOutAt: { $exists: false },
    });
    if (open) badRequest("Already clocked in");
    const record = await AttendanceRecord.create({
      businessId: biz(ctx),
      employeeId: ctx.employee._id,
      clockInAt: new Date(),
    });
    await auditEntityCreate(ctx, "AttendanceRecord", record._id.toString());
    return mapAttendance(record);
  },
  clockOut: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAuth(ctx);
    if (!ctx.employee) badRequest("Employee profile required");
    const record = await AttendanceRecord.findOne({
      businessId: biz(ctx),
      employeeId: ctx.employee._id,
      clockOutAt: { $exists: false },
    }).sort({ clockInAt: -1 });
    if (!record) badRequest("Not clocked in");
    record.clockOutAt = new Date();
    await record.save();
    await auditEntityUpdate(ctx, "AttendanceRecord", record._id.toString(), { clockOut: true });
    return mapAttendance(record);
  },
  computePerformanceMetrics: async (
    _: unknown,
    args: { employeeId: string; periodStart: string; periodEnd: string },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "reports.employee.read");
    const start = new Date(args.periodStart);
    const end = new Date(args.periodEnd);
    const sales = await Sale.aggregate([
      {
        $match: {
          businessId: biz(ctx),
          employeeId: new Types.ObjectId(args.employeeId),
          status: "FINALIZED",
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const appointmentCount = await Appointment.countDocuments({
      businessId: biz(ctx),
      assignedEmployeeIds: args.employeeId,
      startAt: { $gte: start, $lte: end },
    });
    const metric = await PerformanceMetric.create({
      businessId: biz(ctx),
      employeeId: args.employeeId,
      periodStart: start,
      periodEnd: end,
      salesTotal: sales[0]?.total ?? 0,
      appointmentCount,
    });
    await auditEntityCreate(ctx, "PerformanceMetric", metric._id.toString());
    return mapPerformance(metric, ctx);
  },
  createService: async (
    _: unknown,
    { input }: { input: { name: string; durationMinutes: number; price: number; description?: string; imageUrl?: string } },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "appointments.create");
    const minor = pricesMinor(ctx);
    const service = await Service.create({
      businessId: biz(ctx),
      name: input.name,
      durationMinutes: input.durationMinutes,
      price: toStoredMoney(input.price, minor),
      description: input.description,
      imageUrl: input.imageUrl?.trim() || undefined,
    });
    if (service.imageUrl) {
      await linkMediaByUrlToEntity(
        new Types.ObjectId(biz(ctx)),
        service.imageUrl,
        "SERVICE",
        service._id.toString(),
      );
    }
    await auditEntityCreate(ctx, "Service", service._id.toString());
    return mapService(service, ctx);
  },
  updateService: async (
    _: unknown,
    {
      id,
      input,
    }: { id: string; input: { name: string; durationMinutes: number; price: number; description?: string; imageUrl?: string } },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "appointments.update");
    const service = await Service.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!service) badRequest("Service not found");
    service.name = input.name;
    service.durationMinutes = input.durationMinutes;
    service.price = toStoredMoney(input.price, pricesMinor(ctx));
    service.description = input.description ?? service.description;
    if (input.imageUrl !== undefined) {
      service.imageUrl = input.imageUrl?.trim() || undefined;
    }
    await stampUpdatedBy(service, ctx);
    await service.save();
    await auditEntityUpdate(ctx, "Service", id);
    if (service.imageUrl) {
      await linkMediaByUrlToEntity(
        new Types.ObjectId(biz(ctx)),
        service.imageUrl,
        "SERVICE",
        service._id.toString(),
      );
    }
    return mapService(service, ctx);
  },
  deleteService: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "inventory.delete");
    const service = await Service.findOne(notDeletedFilter({ _id: id, businessId: biz(ctx) }));
    if (!service) badRequest("Service not found");
    await softDeleteDocument(service, ctx, "Service", id);
    return true;
  },
  createAppointment: async (
    _: unknown,
    args: {
      customerId: string;
      startAt: string;
      endAt: string;
      serviceIds: string[];
      assignedEmployeeIds: string[];
    },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "appointments.create");
    const appointment = await Appointment.create({
      businessId: biz(ctx),
      customerId: args.customerId,
      startAt: new Date(args.startAt),
      endAt: new Date(args.endAt),
      serviceIds: args.serviceIds.map((id) => new Types.ObjectId(id)),
      assignedEmployeeIds: args.assignedEmployeeIds.map((id) => new Types.ObjectId(id)),
    });
    await auditEntityCreate(ctx, "Appointment", appointment._id.toString());
    return mapAppointment(appointment);
  },
  assignStaffService: async (_: unknown, args: { employeeId: string; serviceId: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "appointments.update");
    const row = await StaffServiceAssignment.create({
      businessId: biz(ctx),
      employeeId: args.employeeId,
      serviceId: args.serviceId,
    });
    await auditEntityCreate(ctx, "StaffServiceAssignment", row._id.toString());
    return {
      id: row._id.toString(),
      employeeId: row.employeeId.toString(),
      serviceId: row.serviceId.toString(),
    };
  },
  createCommissionRule: async (
    _: unknown,
    args: { name: string; percent: number; appliesTo?: "PRODUCT" | "SERVICE" | "ALL" },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "employees.update");
    const rule = await CommissionRule.create({
      businessId: biz(ctx),
      name: args.name,
      percent: args.percent,
      appliesTo: args.appliesTo ?? "ALL",
    });
    await auditEntityCreate(ctx, "CommissionRule", rule._id.toString());
    return {
      id: rule._id.toString(),
      name: rule.name,
      percent: rule.percent,
      appliesTo: rule.appliesTo,
      isActive: rule.isActive,
    };
  },
  createExpense: async (_: unknown, args: { category: string; amount: number; incurredAt: string; description?: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "reports.financial.read");
    const minor = pricesMinor(ctx);
    const expense = await Expense.create({
      businessId: biz(ctx),
      category: args.category,
      amount: toStoredMoney(args.amount, minor),
      incurredAt: new Date(args.incurredAt),
      description: args.description,
    });
    await auditEntityCreate(ctx, "Expense", expense._id.toString());
    return {
      id: expense._id.toString(),
      category: expense.category,
      amount: fromStoredMoney(expense.amount, minor),
      description: expense.description ?? null,
      incurredAt: expense.incurredAt.toISOString(),
    };
  },
  createInvoiceFromSale: async (_: unknown, { saleId }: { saleId: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "reports.financial.read");
    const sale = await Sale.findOne({ _id: saleId, businessId: biz(ctx), status: "FINALIZED" });
    if (!sale) badRequest("Sale not found");
    const invoice = await Invoice.create({
      businessId: biz(ctx),
      invoiceNumber: `INV-${Date.now()}`,
      saleId: sale._id,
      customerId: sale.customerId,
      employeeId: sale.employeeId,
      status: "ISSUED",
      total: sale.total,
      issuedAt: new Date(),
    });
    await auditEntityCreate(ctx, "Invoice", invoice._id.toString(), { saleId });
    const minor = pricesMinor(ctx);
    return {
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      saleId: invoice.saleId?.toString() ?? null,
      employeeId: invoice.employeeId?.toString() ?? null,
      status: invoice.status,
      total: fromStoredMoney(invoice.total, minor),
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
    };
  },
  createLoyaltyRule: async (_: unknown, args: { name: string; pointsPerCurrency: number }, ctx: GraphQLContext) => {
    requirePermission(ctx, "settings.update");
    const rule = await LoyaltyRule.create({ businessId: biz(ctx), ...args });
    await auditEntityCreate(ctx, "LoyaltyRule", rule._id.toString());
    return {
      id: rule._id.toString(),
      name: rule.name,
      pointsPerCurrency: rule.pointsPerCurrency,
      isActive: rule.isActive,
    };
  },
  markNotificationRead: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requireAuth(ctx);
    const n = await Notification.findOneAndUpdate(
      { _id: id, businessId: biz(ctx) },
      { readAt: new Date() },
      { new: true },
    );
    if (!n) badRequest("Notification not found");
    await auditEntityUpdate(ctx, "Notification", id, { read: true });
    return mapNotification(n!);
  },
  createFraudRule: async (
    _: unknown,
    args: { name: string; ruleType: "LARGE_DISCOUNT" | "VOID_VELOCITY" | "CUSTOM"; threshold: number },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "audit.read");
    const rule = await FraudRule.create({
      businessId: biz(ctx),
      name: args.name,
      ruleType: args.ruleType,
      threshold: args.threshold,
    });
    await auditEntityCreate(ctx, "FraudRule", rule._id.toString());
    return {
      id: rule._id.toString(),
      name: rule.name,
      ruleType: rule.ruleType,
      threshold: rule.threshold,
      isActive: rule.isActive,
    };
  },
  resolveActivityFlag: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "audit.read");
    const flag = await ActivityFlag.findOneAndUpdate(
      { _id: id, businessId: biz(ctx) },
      { resolvedAt: new Date() },
      { new: true },
    );
    if (!flag) badRequest("Flag not found");
    await auditEntityUpdate(ctx, "ActivityFlag", id, { resolved: true });
    return {
      id: flag!._id.toString(),
      severity: flag!.severity,
      message: flag!.message,
      resolvedAt: flag!.resolvedAt?.toISOString() ?? null,
      createdAt: flag!.createdAt.toISOString(),
    };
  },
  exportProductsCsv: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requirePermission(ctx, "import.export");
    const minor = pricesMinor(ctx);
    const products = await Product.find({ businessId: biz(ctx) });
    const header = "id,name,sku,barcode,price,cost\n";
    const csv =
      header +
      products
        .map((p) =>
          [
            p._id.toString(),
            p.name,
            p.sku ?? "",
            p.barcode ?? "",
            fromStoredMoney(p.price, minor),
            fromStoredMoney(p.cost, minor),
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");
    await writeAuditLogFromContext(ctx, {
      action: "product.export",
      entityType: "Product",
      metadata: { count: products.length },
    });
    return { filename: "products.csv", csv };
  },
  importProductsCsv: async (_: unknown, { csv }: { csv: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "import.export");
    const minor = pricesMinor(ctx);
    const lines = csv.trim().split("\n").slice(1);
    let count = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = line.match(/(".*?"|[^,]+)/g)?.map((c) => c.replace(/^"|"$/g, "")) ?? [];
      if (cols.length < 2) continue;
      const priceMajor = Number(cols[4] ?? 0);
      const costMajor = Number(cols[5] ?? 0);
      await Product.create({
        businessId: biz(ctx),
        name: cols[1] ?? "Imported",
        sku: cols[2] || undefined,
        barcode: cols[3] || undefined,
        price: toStoredMoney(priceMajor, minor),
        cost: toStoredMoney(costMajor, minor),
      });
      count++;
    }
    if (count > 0) {
      await writeAuditLogFromContext(ctx, {
        action: "product.create",
        entityType: "Product",
        metadata: { bulkImport: true, count },
      });
    }
    return count;
  },
  syncPush: async (
    _: unknown,
    {
      items,
    }: {
      items: Array<{
        entityType: string;
        entityId: string;
        operation: "CREATE" | "UPDATE" | "DELETE";
        payload: Record<string, unknown>;
        clientUpdatedAt: string;
      }>;
    },
    ctx: GraphQLContext,
  ) => {
    requireAuth(ctx);
    const created = [];
    for (const item of items) {
      const row = await SyncQueueItem.create({
        businessId: biz(ctx),
        userId: ctx.user!._id,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        payload: item.payload,
        clientUpdatedAt: new Date(item.clientUpdatedAt),
      });
      created.push({
        id: row._id.toString(),
        entityType: row.entityType,
        entityId: row.entityId,
        operation: row.operation,
        syncedAt: null,
      });
    }
    if (created.length > 0) {
      await writeAuditLogFromContext(ctx, {
        action: "syncqueue.create",
        entityType: "SyncQueue",
        metadata: { itemCount: created.length },
      });
    }
    return created;
  },
  syncAck: async (_: unknown, { ids }: { ids: string[] }, ctx: GraphQLContext) => {
    requireAuth(ctx);
    await SyncQueueItem.updateMany(
      { _id: { $in: ids }, businessId: biz(ctx), userId: ctx.user!._id },
      { syncedAt: new Date() },
    );
    if (ids.length > 0) {
      await writeAuditLogFromContext(ctx, {
        action: "syncqueue.update",
        entityType: "SyncQueue",
        metadata: { ackCount: ids.length },
      });
    }
    return true;
  },
  saleReceipt: async (_: unknown, { saleId }: { saleId: string }, ctx: GraphQLContext) => {
    requireAuth(ctx);
    if (!ctx.permissions.has("sales.read") && !ctx.permissions.has("sales.pos.checkout")) {
      forbidden("Missing permission: sales.read or sales.pos.checkout");
    }
    const sale = await Sale.findOne({ _id: saleId, businessId: biz(ctx), status: "FINALIZED" });
    if (!sale) badRequest("Sale not found");
    const receipt = await buildReceipt(sale);
    return {
      ...receipt,
      escPosStub: buildEscPosStub(receipt),
    };
  },
  createMediaAsset: async (
    _: unknown,
    { input }: { input: Record<string, string | null | undefined> },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "media.manage");
    return createMediaAsset(
      new Types.ObjectId(biz(ctx)),
      ctx.user!._id,
      {
        filename: String(input.filename ?? ""),
        mimeType: String(input.mimeType ?? ""),
        dataBase64: String(input.dataBase64 ?? ""),
        altText: input.altText,
        entityType: input.entityType,
        entityId: input.entityId,
      },
      ctx,
    );
  },
  updateMediaAsset: async (
    _: unknown,
    { id, input }: { id: string; input: Record<string, string | boolean | null | undefined> },
    ctx: GraphQLContext,
  ) => {
    requirePermission(ctx, "media.manage");
    return updateMediaAsset(
      new Types.ObjectId(biz(ctx)),
      id,
      {
        altText: input.altText as string | null | undefined,
        entityType: input.entityType as string | null | undefined,
        entityId: input.entityId as string | null | undefined,
        clearEntityLink: input.clearEntityLink as boolean | null | undefined,
      },
      ctx,
    );
  },
  deleteMediaAsset: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requirePermission(ctx, "media.manage");
    return deleteMediaAsset(new Types.ObjectId(biz(ctx)), id, ctx);
  },
};
