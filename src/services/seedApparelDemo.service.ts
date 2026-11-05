import bcrypt from "bcryptjs";
import type { Types } from "mongoose";
import { Business } from "../models/Business.js";
import { Employee } from "../models/Employee.js";
import { Role } from "../models/Role.js";
import { User } from "../models/User.js";
import { Product, Service } from "../models/catalog.js";
import {
  Location,
  StockLevel,
  StockMovement,
  StockTransfer,
} from "../models/inventory.js";
import {
  CashRegister,
  Customer,
  DiscountRule,
  Payment,
  RegisterSession,
  Return,
  Sale,
  TaxRule,
} from "../models/sales.js";
import { Supplier, PurchaseOrder } from "../models/procurement.js";
import { PaymentChannel } from "../models/paymentChannel.js";
import {
  Appointment,
  CommissionEntry,
  CommissionRule,
  StaffServiceAssignment,
} from "../models/appointments.js";
import { Shift, AttendanceRecord, PerformanceMetric } from "../models/hr.js";
import { Expense, Invoice } from "../models/finance.js";
import { CustomerLoyaltyBalance, LoyaltyRule } from "../models/loyalty.js";
import { ActivityFlag, FraudRule, SyncQueueItem } from "../models/compliance.js";
import { Notification } from "../models/notifications.js";
import { AuditLog } from "../models/AuditLog.js";
import { MediaAsset } from "../models/MediaAsset.js";
import { seedBusinessDefaults } from "./seed.service.js";
import { seedApparelCatalog } from "./apparelCatalog.service.js";
import { defaultAvatarUrlForSeed } from "./avatarPresets.service.js";
import { hashPosPin } from "./pos.service.js";
import { buildSaleTotals, computeLineTotal, createReturn } from "./sales.service.js";
import { completeStockTransfer } from "./inventory.service.js";
import { toStoredMoney } from "../utils/money.js";

const SEED_PASSWORD = "Pineapple1!";

type StaffSpec = {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  roleName: string;
  posPin?: string;
};

const STAFF_USERS: StaffSpec[] = [
  {
    email: "joseph.awer+admin@gmial.com",
    name: "Joseph Admin",
    firstName: "Joseph",
    lastName: "Admin",
    roleName: "Owner",
  },
  {
    email: "joseph.awer+webapp@gmial.com",
    name: "Joseph Web",
    firstName: "Joseph",
    lastName: "Webapp",
    roleName: "Manager",
  },
  {
    email: "joseph.awer+cashier@gmial.com",
    name: "Esi Cashier",
    firstName: "Esi",
    lastName: "Mensah",
    roleName: "Cashier",
    posPin: SEED_PASSWORD,
  },
  {
    email: "joseph.awer+inventory@gmial.com",
    name: "Kwame Inventory",
    firstName: "Kwame",
    lastName: "Boateng",
    roleName: "InventoryClerk",
  },
  {
    email: "joseph.awer+stylist@gmial.com",
    name: "Ama Stylist",
    firstName: "Ama",
    lastName: "Adjei",
    roleName: "Stylist",
    posPin: SEED_PASSWORD,
  },
  {
    email: "joseph.awer+accountant@gmial.com",
    name: "Kofi Finance",
    firstName: "Kofi",
    lastName: "Asante",
    roleName: "Accountant",
  },
];

const POS_ONLY_CASHIER = {
  firstName: "Yaa",
  lastName: "Osei",
  roleName: "Cashier",
  posPin: SEED_PASSWORD,
};

export type SeedApparelDemoOptions = {
  historyDays?: number;
  rngSeed?: number;
};

export type SeedApparelDemoResult = {
  businessId: string;
  businessName: string;
  catalog: Awaited<ReturnType<typeof seedApparelCatalog>>;
  salesFinalized: number;
  returnsCreated: number;
  customersCreated: number;
  appointmentsCreated: number;
  purchaseOrdersCreated: number;
};

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(10, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function randomTimeOnDay(rng: () => number, day: Date): Date {
  const base = startOfDay(day);
  const minutes = randomInt(rng, 0, 9 * 60);
  return new Date(base.getTime() + minutes * 60_000);
}

async function setDocumentTimestamps(
  collection: { updateOne: (filter: object, update: object) => Promise<unknown> },
  id: Types.ObjectId,
  at: Date,
  fields: string[] = ["createdAt", "updatedAt"],
): Promise<void> {
  const $set: Record<string, Date> = {};
  for (const f of fields) $set[f] = at;
  await collection.updateOne({ _id: id }, { $set });
}

async function wipeOperationalData(businessId: Types.ObjectId): Promise<void> {
  await Promise.all([
    Payment.deleteMany({ businessId }),
    Return.deleteMany({ businessId }),
    Sale.deleteMany({ businessId }),
    RegisterSession.deleteMany({ businessId }),
    CashRegister.deleteMany({ businessId }),
    Customer.deleteMany({ businessId }),
    DiscountRule.deleteMany({ businessId }),
    TaxRule.deleteMany({ businessId }),
    Appointment.deleteMany({ businessId }),
    StaffServiceAssignment.deleteMany({ businessId }),
    CommissionEntry.deleteMany({ businessId }),
    CommissionRule.deleteMany({ businessId }),
    Service.deleteMany({ businessId }),
    Shift.deleteMany({ businessId }),
    AttendanceRecord.deleteMany({ businessId }),
    PerformanceMetric.deleteMany({ businessId }),
    Expense.deleteMany({ businessId }),
    Invoice.deleteMany({ businessId }),
    CustomerLoyaltyBalance.deleteMany({ businessId }),
    LoyaltyRule.deleteMany({ businessId }),
    ActivityFlag.deleteMany({ businessId }),
    FraudRule.deleteMany({ businessId }),
    SyncQueueItem.deleteMany({ businessId }),
    Notification.deleteMany({ businessId }),
    AuditLog.deleteMany({ businessId }),
    MediaAsset.deleteMany({ businessId }),
    PurchaseOrder.deleteMany({ businessId }),
    Supplier.deleteMany({ businessId }),
    StockTransfer.deleteMany({ businessId }),
    StockMovement.deleteMany({ businessId }),
    PaymentChannel.deleteMany({ businessId }),
  ]);
}

async function upsertStaffUser(
  businessId: Types.ObjectId,
  spec: StaffSpec,
): Promise<{ user: InstanceType<typeof User>; employee: InstanceType<typeof Employee> }> {
  const role = await Role.findOne({ businessId, name: spec.roleName });
  if (!role) throw new Error(`Role missing: ${spec.roleName}`);

  const email = spec.email.toLowerCase();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const avatarUrl = defaultAvatarUrlForSeed(email);

  let user = await User.findOne({ businessId, email });
  if (user) {
    user.name = spec.name;
    user.passwordHash = passwordHash;
    if (!user.avatarUrl?.trim()) user.avatarUrl = avatarUrl;
    await user.save();
  } else {
    user = await User.create({
      businessId,
      email,
      name: spec.name,
      passwordHash,
      avatarUrl,
    });
  }

  let employee = await Employee.findOne({ businessId, userId: user._id });
  if (employee) {
    employee.firstName = spec.firstName;
    employee.lastName = spec.lastName;
    employee.email = email;
    employee.roleIds = [role._id];
    employee.isActive = true;
    employee.avatarUrl = user.avatarUrl ?? avatarUrl;
    if (spec.posPin) employee.posPinHash = await hashPosPin(spec.posPin);
    await employee.save();
  } else {
    employee = await Employee.create({
      businessId,
      userId: user._id,
      firstName: spec.firstName,
      lastName: spec.lastName,
      email,
      roleIds: [role._id],
      isActive: true,
      avatarUrl: user.avatarUrl ?? avatarUrl,
      ...(spec.posPin ? { posPinHash: await hashPosPin(spec.posPin) } : {}),
    });
  }

  return { user, employee };
}

async function ensurePosOnlyCashier(businessId: Types.ObjectId): Promise<InstanceType<typeof Employee>> {
  const role = await Role.findOne({ businessId, name: POS_ONLY_CASHIER.roleName });
  if (!role) throw new Error("Cashier role missing");

  let employee = await Employee.findOne({
    businessId,
    firstName: POS_ONLY_CASHIER.firstName,
    lastName: POS_ONLY_CASHIER.lastName,
  });
  const pinHash = await hashPosPin(POS_ONLY_CASHIER.posPin);
  if (employee) {
    employee.roleIds = [role._id];
    employee.isActive = true;
    employee.posPinHash = pinHash;
    await employee.save();
    return employee;
  }

  employee = await Employee.create({
    businessId,
    firstName: POS_ONLY_CASHIER.firstName,
    lastName: POS_ONLY_CASHIER.lastName,
    roleIds: [role._id],
    isActive: true,
    posPinHash: pinHash,
    avatarUrl: defaultAvatarUrlForSeed("yaa.osei.pos"),
  });
  return employee;
}

async function configureBusinessProfile(businessId: Types.ObjectId): Promise<void> {
  await Business.findByIdAndUpdate(businessId, {
    name: "Ventos Apparel",
    email: "hello@ventos-apparel.demo",
    phone: "+233 30 123 4567",
    address: "14 Oxford Street, Osu, Accra",
    logoUrl:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=256&h=256&fit=crop&q=80",
  });
}

async function ensureLocations(businessId: Types.ObjectId): Promise<{
  main: InstanceType<typeof Location>;
  stockroom: InstanceType<typeof Location>;
}> {
  let main = await Location.findOne({ businessId, isDefault: true });
  if (!main) {
    main = await Location.create({ businessId, name: "Main Floor", isDefault: true });
  } else if (main.name === "Main") {
    main.name = "Main Floor";
    await main.save();
  }

  let stockroom = await Location.findOne({ businessId, name: "Stockroom" });
  if (!stockroom) {
    stockroom = await Location.create({ businessId, name: "Stockroom", isDefault: false });
  }

  return { main, stockroom };
}

async function seedFoundationRules(
  businessId: Types.ObjectId,
  pricesMinor: boolean,
): Promise<{
  bankChannelId: Types.ObjectId;
  momoChannelId: Types.ObjectId;
  commissionPercent: number;
  loyaltyPointsPerCurrency: number;
  fraudDiscountThreshold: number;
}> {
  await TaxRule.create({
    businessId,
    name: "VAT",
    rate: 12.5,
    mode: "INCLUSIVE",
    isActive: true,
  });

  await DiscountRule.create({
    businessId,
    name: "Staff discount",
    type: "PERCENT",
    value: 10,
    isActive: true,
  });

  await LoyaltyRule.create({
    businessId,
    name: "Style Rewards",
    pointsPerCurrency: 1,
    isActive: true,
  });

  await CommissionRule.create({
    businessId,
    name: "Floor sales commission",
    percent: 3,
    appliesTo: "ALL",
    isActive: true,
  });

  await FraudRule.create({
    businessId,
    name: "Large line discount",
    ruleType: "LARGE_DISCOUNT",
    threshold: toStoredMoney(50, pricesMinor),
    isActive: true,
  });

  const bank = await PaymentChannel.create({
    businessId,
    type: "BANK_ACCOUNT",
    name: "Ventos Apparel — GCB",
    accountNumber: "0123456789012",
  });

  const momo = await PaymentChannel.create({
    businessId,
    type: "MOBILE_MONEY",
    name: "MTN MoMo — Store",
    network: "MTN",
    number: "0244123456",
  });

  const fraudThreshold = toStoredMoney(50, pricesMinor);
  return {
    bankChannelId: bank._id,
    momoChannelId: momo._id,
    commissionPercent: 3,
    loyaltyPointsPerCurrency: 1,
    fraudDiscountThreshold: fraudThreshold,
  };
}

const CUSTOMER_NAMES: [string, string][] = [
  ["Abena", "Owusu"],
  ["Michael", "Tetteh"],
  ["Sarah", "Quaye"],
  ["Daniel", "Appiah"],
  ["Grace", "Amoah"],
  ["Samuel", "Darko"],
  ["Ruth", "Agyeman"],
  ["Prince", "Ofori"],
  ["Linda", "Bonsu"],
  ["Eric", "Nyarko"],
  ["Felicia", "Annan"],
  ["George", "Sarpong"],
  ["Helena", "Mensah"],
  ["Isaac", "Adom"],
  ["Janet", "Kumi"],
  ["Larry", "Fosu"],
  ["Mabel", "Djan"],
  ["Nana", "Yaa"],
  ["Oscar", "Bruce"],
  ["Patricia", "Larbi"],
  ["Quincy", "Hammond"],
  ["Rebecca", "Aidoo"],
  ["Stephen", "Koranteng"],
  ["Theresa", "Mould"],
  ["Unity", "Tagoe"],
  ["Victor", "Akoto"],
  ["Wendy", "Frimpong"],
  ["Xander", "Poku"],
  ["Yvonne", "Cudjoe"],
  ["Zara", "Mintah"],
  ["Chris", "Yeboah"],
  ["Diana", "Oppong"],
  ["Emmanuel", "Baffour"],
  ["Faiza", "Salifu"],
  ["Gordon", "Tawiah"],
  ["Hannah", "Serwaa"],
  ["Ivan", "Kwarteng"],
  ["Joyce", "Antwi"],
  ["Kelvin", "Dadzie"],
  ["Lydia", "Boakye"],
];

async function seedCustomers(
  businessId: Types.ObjectId,
  rng: () => number,
  historyDays: number,
): Promise<InstanceType<typeof Customer>[]> {
  const end = new Date();
  const customers: InstanceType<typeof Customer>[] = [];

  for (let i = 0; i < CUSTOMER_NAMES.length; i++) {
    const [firstName, lastName] = CUSTOMER_NAMES[i]!;
    const createdAt = addDays(end, -randomInt(rng, 1, historyDays));
    const customer = await Customer.create({
      businessId,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `024${String(1000000 + i).slice(-7)}`,
    });
    await setDocumentTimestamps(Customer.collection, customer._id, createdAt, ["createdAt", "updatedAt"]);
    customers.push(customer);
  }

  return customers;
}

async function seedServicesAndStaffAssignments(
  businessId: Types.ObjectId,
  stylistEmployeeId: Types.ObjectId,
  pricesMinor: boolean,
): Promise<InstanceType<typeof Service>[]> {
  const defs = [
    {
      name: "Personal styling session",
      durationMinutes: 60,
      price: 180,
      description: "One-on-one outfit planning and size consultation",
      imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=480&h=480&fit=crop&q=80",
    },
    {
      name: "Alterations fitting",
      durationMinutes: 30,
      price: 45,
      description: "Hem, waist, and sleeve adjustments",
      imageUrl: "https://images.unsplash.com/photo-1558171813-4c088754af7f?w=480&h=480&fit=crop&q=80",
    },
    {
      name: "Wardrobe consultation",
      durationMinutes: 90,
      price: 250,
      description: "Seasonal wardrobe refresh with lookbook notes",
      imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e3685b?w=480&h=480&fit=crop&q=80",
    },
  ];

  const services: InstanceType<typeof Service>[] = [];
  for (const def of defs) {
    const service = await Service.create({
      businessId,
      name: def.name,
      description: def.description,
      durationMinutes: def.durationMinutes,
      price: toStoredMoney(def.price, pricesMinor),
      isActive: true,
      imageUrl: def.imageUrl,
    });
    services.push(service);
    await StaffServiceAssignment.create({
      businessId,
      employeeId: stylistEmployeeId,
      serviceId: service._id,
    });
  }

  return services;
}

async function seedSuppliersAndPurchases(
  businessId: Types.ObjectId,
  mainLocationId: Types.ObjectId,
  products: InstanceType<typeof Product>[],
  rng: () => number,
  historyDays: number,
): Promise<number> {
  const suppliers = await Promise.all([
    Supplier.create({
      businessId,
      name: "Accra Textile Collective",
      email: "orders@accra-textile.demo",
      phone: "+233 24 111 2233",
      address: "Industrial Area, Accra",
    }),
    Supplier.create({
      businessId,
      name: "Denim Lab Wholesale",
      email: "wholesale@denimlab.demo",
      phone: "+233 30 222 3344",
      address: "Tema Port Logistics Park",
    }),
    Supplier.create({
      businessId,
      name: "Step One Footwear Import",
      email: "import@steponedemo.com",
      phone: "+233 55 333 4455",
      address: "Airport City, Accra",
    }),
  ]);

  let poCount = 0;
  const end = new Date();

  for (let i = 0; i < 9; i++) {
    const supplier = pick(rng, suppliers);
    const day = addDays(end, -randomInt(rng, 3, historyDays - 1));
    const lines = Array.from({ length: randomInt(rng, 3, 6) }, () => {
      const product = pick(rng, products);
      return {
        productId: product._id,
        quantityOrdered: randomInt(rng, 12, 48),
        quantityReceived: 0,
        unitCost: product.cost,
      };
    });

    const received = rng() > 0.15;
    const po = await PurchaseOrder.create({
      businessId,
      supplierId: supplier._id,
      locationId: mainLocationId,
      status: received ? "RECEIVED" : pick(rng, ["ORDERED", "PARTIAL"] as const),
      lines: received
        ? lines.map((l) => ({
            ...l,
            quantityReceived: l.quantityOrdered,
          }))
        : lines.map((l) => ({
            ...l,
            quantityReceived: rng() > 0.5 ? Math.floor(l.quantityOrdered / 2) : 0,
          })),
    });
    poCount++;
    await setDocumentTimestamps(PurchaseOrder.collection, po._id, day, ["createdAt", "updatedAt"]);
  }

  return poCount;
}

async function seedRegisterAndSessions(
  businessId: Types.ObjectId,
  locationId: Types.ObjectId,
  cashierIds: Types.ObjectId[],
  rng: () => number,
  historyDays: number,
): Promise<Map<string, Types.ObjectId>> {
  const register = await CashRegister.create({
    businessId,
    name: "Front Counter",
    locationId,
    isActive: true,
  });

  const sessionByDayKey = new Map<string, Types.ObjectId>();
  const end = new Date();

  for (let d = 0; d < historyDays; d++) {
    const day = addDays(end, -d);
    if (day.getDay() === 0) continue;
    const key = day.toISOString().slice(0, 10);
    const openedAt = randomTimeOnDay(rng, day);
    const closedAt = new Date(openedAt.getTime() + randomInt(rng, 7, 10) * 60 * 60_000);
    const session = await RegisterSession.create({
      businessId,
      registerId: register._id,
      openedByEmployeeId: pick(rng, cashierIds),
      closedByEmployeeId: pick(rng, cashierIds),
      openingFloat: toStoredMoney(randomInt(rng, 200, 400), true),
      closingAmount: toStoredMoney(randomInt(rng, 800, 2400), true),
      status: d === 0 && rng() > 0.7 ? "OPEN" : "CLOSED",
      openedAt,
      closedAt: d === 0 && rng() > 0.7 ? undefined : closedAt,
    });
    sessionByDayKey.set(key, session._id);
  }

  return sessionByDayKey;
}

type PlannedSale = {
  at: Date;
  employeeId: Types.ObjectId;
  customerId?: Types.ObjectId;
  registerSessionId?: Types.ObjectId;
  lines: InstanceType<typeof Sale>["lines"];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  payment: {
    method: "CASH" | "CARD" | "MOBILE_MONEY";
    paymentChannelId?: Types.ObjectId;
    reference?: string;
  };
};

function buildPlannedSale(input: {
  at: Date;
  employeeId: Types.ObjectId;
  customerId?: Types.ObjectId;
  registerSessionId?: Types.ObjectId;
  products: InstanceType<typeof Product>[];
  services: InstanceType<typeof Service>[];
  rng: () => number;
  pricesMinor: boolean;
  bankChannelId: Types.ObjectId;
  momoChannelId: Types.ObjectId;
  taxRules: Array<{ name: string; rate: number; mode: "INCLUSIVE" | "EXCLUSIVE"; isActive: boolean }>;
}): PlannedSale {
  const lineCount = randomInt(input.rng, 1, 4);
  const lines: PlannedSale["lines"] = [];

  for (let i = 0; i < lineCount; i++) {
    const useService = input.services.length > 0 && input.rng() < 0.08;
    if (useService) {
      const service = pick(input.rng, input.services);
      const quantity = 1;
      const unitPrice = service.price;
      const discountAmount = 0;
      lines.push({
        lineType: "SERVICE",
        serviceId: service._id,
        name: service.name,
        quantity,
        unitPrice,
        discountAmount,
        lineTotal: computeLineTotal({ quantity, unitPrice, discountAmount }),
      });
    } else {
      const product = pick(input.rng, input.products);
      const quantity = randomInt(input.rng, 1, 2);
      const unitPrice = product.price;
      let discountAmount = 0;
      if (product.discountType === "PERCENT" && product.discountValue > 0) {
        discountAmount = Math.round((unitPrice * product.discountValue) / 100);
      } else if (product.discountType === "FIXED" && product.discountValue > 0) {
        discountAmount = product.discountValue;
      }
      if (input.rng() < 0.06) {
        discountAmount += toStoredMoney(randomInt(input.rng, 5, 25), input.pricesMinor);
      }
      lines.push({
        lineType: "PRODUCT",
        productId: product._id,
        name: product.name,
        quantity,
        unitPrice,
        discountAmount,
        lineTotal: computeLineTotal({ quantity, unitPrice, discountAmount }),
      });
    }
  }

  const totals = buildSaleTotals(lines, input.taxRules);
  const methodRoll = input.rng();
  let payment: PlannedSale["payment"];
  if (methodRoll < 0.42) {
    payment = { method: "CASH" };
  } else if (methodRoll < 0.78) {
    payment = {
      method: "MOBILE_MONEY",
      paymentChannelId: input.momoChannelId,
      reference: `MM${String(Math.floor(input.rng() * 1e8)).padStart(8, "0")}`,
    };
  } else {
    payment = {
      method: "CARD",
      paymentChannelId: input.bankChannelId,
      reference: `POS-${String(Math.floor(input.rng() * 1e6))}`,
    };
  }

  return {
    at: input.at,
    employeeId: input.employeeId,
    customerId: input.customerId,
    registerSessionId: input.registerSessionId,
    lines,
    ...totals,
    payment,
  };
}

async function seedSalesHistory(
  businessId: Types.ObjectId,
  ctx: {
    products: InstanceType<typeof Product>[];
    services: InstanceType<typeof Service>[];
    customers: InstanceType<typeof Customer>[];
    cashierEmployees: InstanceType<typeof Employee>[];
    sessionByDayKey: Map<string, Types.ObjectId>;
    pricesMinor: boolean;
    bankChannelId: Types.ObjectId;
    momoChannelId: Types.ObjectId;
    rng: () => number;
    historyDays: number;
    mainLocationId: Types.ObjectId;
    commissionPercent: number;
    loyaltyPointsPerCurrency: number;
    fraudDiscountThreshold: number;
  },
): Promise<InstanceType<typeof Sale>[]> {
  const end = new Date();
  const taxRuleRows = await TaxRule.find({ businessId });
  const taxRules = taxRuleRows.map((r) => ({
    name: r.name,
    rate: r.rate,
    mode: r.mode,
    isActive: r.isActive,
  }));

  const planned: PlannedSale[] = [];
  for (let d = ctx.historyDays - 1; d >= 0; d--) {
    const day = addDays(end, -d);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const count = isWeekend ? randomInt(ctx.rng, 18, 32) : randomInt(ctx.rng, 10, 22);
    const dayKey = day.toISOString().slice(0, 10);
    const registerSessionId = ctx.sessionByDayKey.get(dayKey);

    for (let i = 0; i < count; i++) {
      planned.push(
        buildPlannedSale({
          at: randomTimeOnDay(ctx.rng, day),
          employeeId: pick(ctx.rng, ctx.cashierEmployees)._id,
          customerId: ctx.rng() < 0.72 ? pick(ctx.rng, ctx.customers)._id : undefined,
          registerSessionId,
          products: ctx.products,
          services: ctx.services,
          rng: ctx.rng,
          pricesMinor: ctx.pricesMinor,
          bankChannelId: ctx.bankChannelId,
          momoChannelId: ctx.momoChannelId,
          taxRules,
        }),
      );
    }
  }

  const saleDocs = planned.map((p) => ({
    businessId,
    customerId: p.customerId,
    registerSessionId: p.registerSessionId,
    employeeId: p.employeeId,
    status: "FINALIZED" as const,
    lines: p.lines,
    subtotal: p.subtotal,
    discountTotal: p.discountTotal,
    taxTotal: p.taxTotal,
    total: p.total,
    createdAt: p.at,
    updatedAt: p.at,
  }));

  const insertedSales = await Sale.insertMany(saleDocs, { ordered: true });
  const paymentDocs = insertedSales.map((sale, idx) => {
    const p = planned[idx]!;
    return {
      businessId,
      saleId: sale._id,
      method: p.payment.method,
      amount: sale.total,
      reference: p.payment.reference,
      paymentChannelId: p.payment.paymentChannelId,
      createdAt: p.at,
    };
  });
  await Payment.insertMany(paymentDocs);

  const commissionDocs = insertedSales
    .filter((s) => s.employeeId)
    .map((sale, idx) => ({
      businessId,
      employeeId: sale.employeeId!,
      saleId: sale._id,
      amount: Math.round((sale.total * ctx.commissionPercent) / 100),
      createdAt: planned[idx]!.at,
    }));
  if (commissionDocs.length) await CommissionEntry.insertMany(commissionDocs);

  const loyaltyByCustomer = new Map<string, number>();
  for (let i = 0; i < insertedSales.length; i++) {
    const sale = insertedSales[i]!;
    if (!sale.customerId) continue;
    const key = sale.customerId.toString();
    const points = Math.floor(sale.total * ctx.loyaltyPointsPerCurrency);
    loyaltyByCustomer.set(key, (loyaltyByCustomer.get(key) ?? 0) + points);
  }
  for (const [customerId, points] of loyaltyByCustomer) {
    await CustomerLoyaltyBalance.findOneAndUpdate(
      { businessId, customerId },
      { $set: { points } },
      { upsert: true },
    );
  }

  const stockDelta = new Map<string, number>();
  const movementDocs: Array<{
    businessId: Types.ObjectId;
    productId: Types.ObjectId;
    locationId: Types.ObjectId;
    movementType: "SALE";
    quantityDelta: number;
    referenceType: string;
    referenceId: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < insertedSales.length; i++) {
    const sale = insertedSales[i]!;
    const at = planned[i]!.at;
    for (const line of sale.lines) {
      if (line.lineType !== "PRODUCT" || !line.productId) continue;
      const product = ctx.products.find((p) => p._id.equals(line.productId!));
      if (!product?.trackInventory) continue;
      const pid = line.productId.toString();
      stockDelta.set(pid, (stockDelta.get(pid) ?? 0) - line.quantity);
      movementDocs.push({
        businessId,
        productId: line.productId,
        locationId: ctx.mainLocationId,
        movementType: "SALE",
        quantityDelta: -line.quantity,
        referenceType: "Sale",
        referenceId: sale._id.toString(),
        createdAt: at,
      });
    }
  }

  if (movementDocs.length) {
    await StockMovement.insertMany(movementDocs, { ordered: false });
  }

  for (const [productId, delta] of stockDelta) {
    await StockLevel.findOneAndUpdate(
      { businessId, productId, locationId: ctx.mainLocationId },
      { $inc: { quantity: delta } },
    );
  }

  const fraudRule = await FraudRule.findOne({ businessId, ruleType: "LARGE_DISCOUNT", isActive: true });
  if (fraudRule) {
    for (const sale of insertedSales) {
      if (sale.discountTotal < ctx.fraudDiscountThreshold) continue;
      await ActivityFlag.create({
        businessId,
        ruleId: fraudRule._id,
        severity: "MEDIUM",
        message: `Large discount on sale ${sale._id.toString()}`,
        metadata: { discountTotal: sale.discountTotal, threshold: ctx.fraudDiscountThreshold },
      });
      break;
    }
  }

  return insertedSales;
}

async function seedReturns(
  businessId: Types.ObjectId,
  sales: InstanceType<typeof Sale>[],
  rng: () => number,
  ownerUserId: Types.ObjectId,
): Promise<number> {
  const candidates = sales.filter((s) => s.lines.some((l) => l.lineType === "PRODUCT"));
  const picks = candidates.slice(0, Math.min(8, candidates.length));
  let count = 0;

  for (const sale of picks) {
    const productLine = sale.lines.find((l) => l.lineType === "PRODUCT" && l.productId);
    if (!productLine?.productId) continue;
    const at = addDays(new Date(sale.createdAt), randomInt(rng, 1, 5));
    try {
      const ret = await createReturn({
        businessId,
        saleId: sale._id.toString(),
        lines: [
          {
            productId: productLine.productId.toString(),
            quantity: 1,
            refundAmount: Math.min(productLine.lineTotal, productLine.unitPrice),
          },
        ],
        reason: pick(rng, ["Wrong size", "Changed mind", "Defective seam", "Color mismatch"]),
        kind: "RETURN",
        stockDisposition: rng() > 0.2 ? "RESTOCK" : "WASTE",
        userId: ownerUserId,
      });
      await setDocumentTimestamps(Return.collection, ret._id, at, ["createdAt"]);
      count++;
    } catch {
      // skip invalid return
    }
  }

  return count;
}

async function seedAppointments(
  businessId: Types.ObjectId,
  customers: InstanceType<typeof Customer>[],
  services: InstanceType<typeof Service>[],
  stylistId: Types.ObjectId,
  rng: () => number,
  historyDays: number,
): Promise<number> {
  let count = 0;
  const end = new Date();

  for (let i = 0; i < 28; i++) {
    const day = addDays(end, -randomInt(rng, -3, historyDays));
    const service = pick(rng, services);
    const startAt = randomTimeOnDay(rng, day);
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
    const inPast = startAt.getTime() < Date.now();
    const status = inPast
      ? pick(rng, ["COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const)
      : "SCHEDULED";

    const appt = await Appointment.create({
      businessId,
      customerId: pick(rng, customers)._id,
      startAt,
      endAt,
      status,
      serviceIds: [service._id],
      assignedEmployeeIds: [stylistId],
      notes: rng() > 0.6 ? "Requested neutral tones for office wear" : undefined,
    });
    await setDocumentTimestamps(Appointment.collection, appt._id, startAt, ["createdAt", "updatedAt"]);
    count++;
  }

  return count;
}

async function seedHrAndPerformance(
  businessId: Types.ObjectId,
  employees: InstanceType<typeof Employee>[],
  rng: () => number,
  historyDays: number,
): Promise<void> {
  const end = new Date();
  for (const employee of employees) {
    for (let d = 0; d < historyDays; d++) {
      const day = addDays(end, -d);
      if (day.getDay() === 0) continue;
      if (rng() > 0.88) continue;
      const clockInAt = randomTimeOnDay(rng, day);
      const clockOutAt = new Date(clockInAt.getTime() + randomInt(rng, 7, 9) * 60 * 60_000);
      const record = await AttendanceRecord.create({
        businessId,
        employeeId: employee._id,
        clockInAt,
        clockOutAt: d === 0 && rng() > 0.5 ? undefined : clockOutAt,
      });
      await setDocumentTimestamps(AttendanceRecord.collection, record._id, clockInAt, ["createdAt"]);
    }

    if (rng() > 0.4) {
      const periodEnd = end;
      const periodStart = addDays(end, -7);
      await Shift.create({
        businessId,
        employeeId: employee._id,
        startAt: periodStart,
        endAt: periodEnd,
        notes: "Floor coverage — main register",
      });
    }
  }

  for (const employee of employees.slice(0, 4)) {
    const periodEnd = end;
    const periodStart = addDays(end, -30);
    const metric = await PerformanceMetric.create({
      businessId,
      employeeId: employee._id,
      periodStart,
      periodEnd,
      salesTotal: toStoredMoney(randomInt(rng, 8000, 42000), true),
      appointmentCount: randomInt(rng, 2, 18),
    });
    await setDocumentTimestamps(PerformanceMetric.collection, metric._id, periodEnd, ["createdAt"]);
  }
}

async function seedFinanceAndInvoices(
  businessId: Types.ObjectId,
  sales: InstanceType<typeof Sale>[],
  rng: () => number,
  historyDays: number,
): Promise<void> {
  const end = new Date();
  const expenseCategories = ["Rent", "Utilities", "Marketing", "Supplies", "Payroll", "Delivery"];

  for (let i = 0; i < 22; i++) {
    const incurredAt = addDays(end, -randomInt(rng, 0, historyDays));
    const expense = await Expense.create({
      businessId,
      category: pick(rng, expenseCategories),
      amount: toStoredMoney(randomInt(rng, 120, 4500), true),
      description: pick(rng, [
        "Instagram campaign boost",
        "Shop electricity",
        "Garment bags restock",
        "Staff transport allowance",
        "Mall levy",
      ]),
      incurredAt,
    });
    await setDocumentTimestamps(Expense.collection, expense._id, incurredAt, ["createdAt"]);
  }

  const invoiceSales = sales.filter((_, idx) => idx % 17 === 0).slice(0, 12);
  let serial = 1001;
  for (const sale of invoiceSales) {
    const issuedAt = new Date(sale.createdAt);
    const invoice = await Invoice.create({
      businessId,
      invoiceNumber: `INV-${serial++}`,
      saleId: sale._id,
      employeeId: sale.employeeId,
      status: pick(rng, ["ISSUED", "ISSUED", "PAID"] as const),
      total: sale.total,
      issuedAt,
    });
    await setDocumentTimestamps(Invoice.collection, invoice._id, issuedAt, ["createdAt", "updatedAt"]);
  }
}

async function seedStockTransfer(
  businessId: Types.ObjectId,
  mainId: Types.ObjectId,
  stockroomId: Types.ObjectId,
  products: InstanceType<typeof Product>[],
  ownerUserId: Types.ObjectId,
  inventoryEmployeeId: Types.ObjectId,
  rng: () => number,
): Promise<void> {
  for (let t = 0; t < 4; t++) {
    const lines = Array.from({ length: randomInt(rng, 2, 4) }, () => ({
      productId: pick(rng, products)._id,
      quantity: randomInt(rng, 3, 12),
    }));

    const transfer = await StockTransfer.create({
      businessId,
      fromLocationId: stockroomId,
      toLocationId: mainId,
      status: "DRAFT",
      lines,
    });

    await StockLevel.findOneAndUpdate(
      { businessId, productId: lines[0]!.productId, locationId: stockroomId },
      { $setOnInsert: { quantity: 40 } },
      { upsert: true },
    );

    try {
      await completeStockTransfer(
        businessId,
        transfer._id.toString(),
        ownerUserId,
        inventoryEmployeeId,
      );
    } catch {
      await StockTransfer.findByIdAndUpdate(transfer._id, { status: "COMPLETED" });
    }
  }
}

async function seedLowStockItems(
  businessId: Types.ObjectId,
  products: InstanceType<typeof Product>[],
  rng: () => number,
): Promise<void> {
  const main = await Location.findOne({ businessId, isDefault: true });
  if (!main) return;
  for (const product of products.slice(0, 6)) {
    await StockLevel.findOneAndUpdate(
      { businessId, productId: product._id, locationId: main._id },
      { quantity: randomInt(rng, 1, 8) },
      { upsert: true },
    );
  }
}

async function seedNotificationsAndCompliance(
  businessId: Types.ObjectId,
  rng: () => number,
  historyDays: number,
): Promise<void> {
  const end = new Date();
  const notices = [
    ["Low stock alert", "Classic Leather Sneaker is down to 4 units on Main Floor"],
    ["New loyalty member", "Abena Owusu crossed 500 Style Rewards points"],
    ["Register closed", "Front Counter session closed with GH₵1,842.50"],
    ["Purchase received", "PO from Denim Lab Wholesale marked received"],
    ["Appointment reminder", "Personal styling session tomorrow at 11:00"],
    ["Weekly summary", "Sales up 12% vs prior week — great work team"],
  ];

  for (let i = 0; i < notices.length; i++) {
    const [title, body] = notices[i]!;
    const createdAt = addDays(end, -randomInt(rng, 0, historyDays));
    const readAt = rng() > 0.45 ? addDays(createdAt, 1) : undefined;
    const n = await Notification.create({
      businessId,
      title,
      body,
      readAt,
    });
    await setDocumentTimestamps(Notification.collection, n._id, createdAt, ["createdAt"]);
  }

  const flagResolved = await ActivityFlag.create({
    businessId,
    severity: "MEDIUM",
    message: "Large discount applied on sale during evening rush",
    resolvedAt: addDays(end, -2),
  });
  await setDocumentTimestamps(ActivityFlag.collection, flagResolved._id, addDays(end, -5), ["createdAt"]);

  const flagOpen = await ActivityFlag.create({
    businessId,
    severity: "LOW",
    message: "Multiple void attempts from training register",
  });
  await setDocumentTimestamps(ActivityFlag.collection, flagOpen._id, addDays(end, -1), ["createdAt"]);
}

async function seedMediaLibrary(
  businessId: Types.ObjectId,
  ownerUserId: Types.ObjectId,
  products: InstanceType<typeof Product>[],
): Promise<void> {
  for (const product of products.slice(0, 15)) {
    if (!product.imageUrl) continue;
    await MediaAsset.create({
      businessId,
      uploadedBy: ownerUserId,
      filename: `${product.sku ?? product._id.toString()}.jpg`,
      storagePath: product.imageUrl,
      url: product.imageUrl,
      mimeType: "image/jpeg",
      sizeBytes: 120_000,
      altText: product.name,
      entityType: "PRODUCT",
      entityId: product._id,
    });
  }
}

async function seedAuditTrail(businessId: Types.ObjectId, ownerUserId: Types.ObjectId, rng: () => number): Promise<void> {
  const actions = [
    ["product.update", "Product"],
    ["sale.update", "Sale"],
    ["inventory.movement", "StockMovement"],
    ["employee.update", "Employee"],
    ["purchase.create", "PurchaseOrder"],
  ];
  const end = new Date();
  for (let i = 0; i < 40; i++) {
    const [action, entityType] = pick(rng, actions);
    const createdAt = addDays(end, -randomInt(rng, 0, 29));
    await AuditLog.create({
      businessId,
      userId: ownerUserId,
      action,
      entityType,
      entityId: undefined,
      ipAddress: "127.0.0.1",
      metadata: { seed: true },
      createdAt,
    });
  }
}

async function seedSyncQueue(businessId: Types.ObjectId, ownerUserId: Types.ObjectId): Promise<void> {
  await SyncQueueItem.create({
    businessId,
    userId: ownerUserId,
    entityType: "Product",
    entityId: "pending-sync-demo",
    operation: "UPDATE",
    payload: { note: "Offline price label sync" },
    clientUpdatedAt: addDays(new Date(), -1),
  });
}

export async function seedApparelDemo(
  businessId: Types.ObjectId,
  options: SeedApparelDemoOptions = {},
): Promise<SeedApparelDemoResult> {
  const historyDays = options.historyDays ?? 30;
  const rng = mulberry32(options.rngSeed ?? 20260921);

  const business = await Business.findById(businessId);
  if (!business) throw new Error("Business not found");
  const pricesMinor = business.monetaryStorageMinor !== false;

  await seedBusinessDefaults(businessId);
  await wipeOperationalData(businessId);
  await configureBusinessProfile(businessId);

  const staff: InstanceType<typeof Employee>[] = [];
  let ownerUser: InstanceType<typeof User> | null = null;

  for (const spec of STAFF_USERS) {
    const { user, employee } = await upsertStaffUser(businessId, spec);
    staff.push(employee);
    if (spec.roleName === "Owner") ownerUser = user;
  }

  staff.push(await ensurePosOnlyCashier(businessId));
  if (!ownerUser) throw new Error("Owner user missing");

  const catalog = await seedApparelCatalog(businessId);
  const { main, stockroom } = await ensureLocations(businessId);

  const products = await Product.find({ businessId, isActive: true });
  const stylist = staff.find((e) => e.firstName === "Ama" && e.lastName === "Adjei");
  if (!stylist) throw new Error("Stylist employee missing");

  const services = await seedServicesAndStaffAssignments(businessId, stylist._id, pricesMinor);
  const foundation = await seedFoundationRules(businessId, pricesMinor);
  const customers = await seedCustomers(businessId, rng, historyDays);

  const cashierEmployees = staff.filter((e) =>
    ["Esi", "Yaa"].some((n) => e.firstName === n),
  );
  if (cashierEmployees.length === 0) cashierEmployees.push(staff[0]!);

  const sessionByDayKey = await seedRegisterAndSessions(
    businessId,
    main._id,
    cashierEmployees.map((e) => e._id),
    rng,
    historyDays,
  );

  const purchaseOrdersCreated = await seedSuppliersAndPurchases(
    businessId,
    main._id,
    products,
    rng,
    historyDays,
  );

  console.log("Generating ~30 days of sales history…");
  const sales = await seedSalesHistory(businessId, {
    products,
    services,
    customers,
    cashierEmployees,
    sessionByDayKey,
    pricesMinor,
    bankChannelId: foundation.bankChannelId,
    momoChannelId: foundation.momoChannelId,
    rng,
    historyDays,
    mainLocationId: main._id,
    commissionPercent: foundation.commissionPercent,
    loyaltyPointsPerCurrency: foundation.loyaltyPointsPerCurrency,
    fraudDiscountThreshold: foundation.fraudDiscountThreshold,
  });

  const returnsCreated = await seedReturns(businessId, sales, rng, ownerUser._id);
  const appointmentsCreated = await seedAppointments(
    businessId,
    customers,
    services,
    stylist._id,
    rng,
    historyDays,
  );

  await seedHrAndPerformance(businessId, staff, rng, historyDays);
  await seedFinanceAndInvoices(businessId, sales, rng, historyDays);

  const inventoryClerk = staff.find((e) => e.firstName === "Kwame");
  if (inventoryClerk) {
    await seedStockTransfer(
      businessId,
      main._id,
      stockroom._id,
      products,
      ownerUser._id,
      inventoryClerk._id,
      rng,
    );
  }

  await seedLowStockItems(businessId, products, rng);
  await seedNotificationsAndCompliance(businessId, rng, historyDays);
  await seedMediaLibrary(businessId, ownerUser._id, products);
  await seedAuditTrail(businessId, ownerUser._id, rng);
  await seedSyncQueue(businessId, ownerUser._id);

  return {
    businessId: businessId.toString(),
    businessName: "Ventos Apparel",
    catalog,
    salesFinalized: sales.length,
    returnsCreated,
    customersCreated: customers.length,
    appointmentsCreated,
    purchaseOrdersCreated,
  };
}
