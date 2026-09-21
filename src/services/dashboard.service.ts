import type { Types } from "mongoose";
import { Appointment } from "../models/appointments.js";
import { Product } from "../models/catalog.js";
import { Expense } from "../models/finance.js";
import { StockLevel } from "../models/inventory.js";
import { notDeletedFilter } from "../models/shared/documentLifecycle.js";
import { Customer, RegisterSession, Sale } from "../models/sales.js";
import { fromStoredMoney } from "../utils/money.js";

const LOW_STOCK_THRESHOLD = 5;
const DAY_MS = 86400000;

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const keys: string[] = [];
  const today = startOfDay();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    keys.push(dateKey(d));
  }
  return keys;
}

function mergeDailySeries(
  keys: string[],
  rows: { _id: string; total: number; count: number }[],
): { label: string; value: number; count: number }[] {
  const map = new Map(rows.map((r) => [r._id, r]));
  return keys.map((label) => {
    const row = map.get(label);
    return { label, value: row?.total ?? 0, count: row?.count ?? 0 };
  });
}

async function sumSales(
  businessId: Types.ObjectId,
  from: Date,
  to?: Date,
  employeeId?: Types.ObjectId,
) {
  const match: Record<string, unknown> = {
    businessId,
    status: "FINALIZED",
    createdAt: { $gte: from },
  };
  if (employeeId) match.employeeId = employeeId;
  if (to) (match.createdAt as { $gte: Date; $lte?: Date }).$lte = to;
  const rows = await Sale.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
  ]);
  return { total: rows[0]?.total ?? 0, count: rows[0]?.count ?? 0 };
}

export async function buildHomeDashboard(
  businessId: Types.ObjectId,
  trendDays = 14,
  pricesAreMinor = false,
) {
  const money = (n: number) => fromStoredMoney(n, pricesAreMinor);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const yesterdayEnd = new Date(todayEnd.getTime() - DAY_MS);
  const last7Start = new Date(todayStart.getTime() - 6 * DAY_MS);
  const last30Start = new Date(todayStart.getTime() - 29 * DAY_MS);
  const next7End = new Date(todayEnd.getTime() + 7 * DAY_MS);

  const [
    salesToday,
    salesYesterday,
    sales7,
    sales30,
    openRegisterSessions,
    lowStockCount,
    appointmentsToday,
    appointmentsNext7,
    customerCount,
    newCustomers30,
    productCount,
    expenses30,
    salesTrendRows,
    apptTrendRows,
    expenseTrendRows,
    topProducts,
    lowStockLevels,
    salesByWeekday,
  ] = await Promise.all([
    sumSales(businessId, todayStart, todayEnd),
    sumSales(businessId, yesterdayStart, yesterdayEnd),
    sumSales(businessId, last7Start),
    sumSales(businessId, last30Start),
    RegisterSession.countDocuments({ businessId, status: "OPEN" }),
    StockLevel.countDocuments({ businessId, quantity: { $lte: LOW_STOCK_THRESHOLD } }),
    Appointment.countDocuments({
      businessId,
      startAt: { $gte: todayStart, $lte: todayEnd },
    }),
    Appointment.countDocuments({
      businessId,
      startAt: { $gte: todayStart, $lte: next7End },
    }),
    Customer.countDocuments(notDeletedFilter({ businessId })),
    Customer.countDocuments(
      notDeletedFilter({ businessId, createdAt: { $gte: last30Start } }),
    ),
    Product.countDocuments(notDeletedFilter({ businessId })),
    Expense.aggregate([
      { $match: { businessId, incurredAt: { $gte: last30Start } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Sale.aggregate([
      {
        $match: {
          businessId,
          status: "FINALIZED",
          createdAt: { $gte: new Date(todayStart.getTime() - (trendDays - 1) * DAY_MS) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([
      {
        $match: {
          businessId,
          startAt: { $gte: last7Start, $lte: next7End },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$startAt" } },
          total: { $sum: 1 },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Expense.aggregate([
      { $match: { businessId, incurredAt: { $gte: last30Start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$incurredAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      {
        $match: {
          businessId,
          status: "FINALIZED",
          createdAt: { $gte: last30Start },
        },
      },
      { $unwind: "$lines" },
      {
        $group: {
          _id: "$lines.productId",
          name: { $first: "$lines.name" },
          value: { $sum: "$lines.lineTotal" },
          secondary: { $sum: "$lines.quantity" },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 8 },
    ]),
    StockLevel.find({ businessId, quantity: { $lte: LOW_STOCK_THRESHOLD } })
      .sort({ quantity: 1 })
      .limit(8)
      .lean(),
    Sale.aggregate([
      {
        $match: {
          businessId,
          status: "FINALIZED",
          createdAt: { $gte: last30Start },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const trendKeys = lastNDays(trendDays);
  const salesTrend = mergeDailySeries(trendKeys, salesTrendRows).map(({ label, value, count }) => ({
    label,
    value: money(value),
    count,
  }));
  const ordersTrend = salesTrend.map(({ label, count }) => ({ label, value: count, count }));
  const apptKeys = lastNDays(7);
  const appointmentsTrend = mergeDailySeries(apptKeys, apptTrendRows);
  const expenseKeys = lastNDays(30);
  const expenseByDay = mergeDailySeries(expenseKeys, expenseTrendRows).map(({ label, value, count }) => ({
    label,
    value: money(value),
    count,
  }));

  const revenueVsExpenses = trendKeys.map((label) => {
    const salesPoint = salesTrend.find((s) => s.label === label);
    const expPoint = expenseByDay.find((e) => e.label === label);
    return {
      label,
      revenue: salesPoint?.value ?? 0,
      expenses: expPoint?.value ?? 0,
    };
  });

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const salesByDayOfWeek = weekdayLabels.map((label, idx) => {
    const mongoDow = idx + 1;
    const row = salesByWeekday.find((r: { _id: number }) => r._id === mongoDow);
    return { label, value: money(row?.total ?? 0), count: row?.count ?? 0 };
  });

  const productIds = lowStockLevels.map((l) => l.productId);
  const products =
    productIds.length > 0
      ? await Product.find({ _id: { $in: productIds } }).lean()
      : [];
  const productNameById = new Map(products.map((p) => [p._id.toString(), p.name]));

  const lowStockProducts = lowStockLevels.map((level) => ({
    id: level.productId.toString(),
    name: productNameById.get(level.productId.toString()) ?? "Product",
    value: level.quantity,
    secondary: LOW_STOCK_THRESHOLD,
  }));

  const expensesTotal30 = money(expenses30[0]?.total ?? 0);
  const salesTodayMajor = money(salesToday.total);
  const salesYesterdayMajor = money(salesYesterday.total);
  const sales7Major = money(sales7.total);
  const sales30Major = money(sales30.total);
  const avgOrderValue30Days = sales30.count > 0 ? sales30Major / sales30.count : 0;

  let salesTodayChangePercent = 0;
  if (salesYesterdayMajor > 0) {
    salesTodayChangePercent =
      ((salesTodayMajor - salesYesterdayMajor) / salesYesterdayMajor) * 100;
  } else if (salesTodayMajor > 0) {
    salesTodayChangePercent = 100;
  }

  return {
    kpis: {
      salesToday: salesTodayMajor,
      salesYesterday: salesYesterdayMajor,
      salesTodayChangePercent,
      salesLast7Days: sales7Major,
      salesLast30Days: sales30Major,
      ordersToday: salesToday.count,
      ordersLast7Days: sales7.count,
      avgOrderValue30Days,
      openRegisterSessions,
      lowStockCount,
      appointmentsToday,
      appointmentsNext7Days: appointmentsNext7,
      customerCount,
      newCustomers30Days: newCustomers30,
      productCount,
      expensesLast30Days: expensesTotal30,
      netRevenue30Days: sales30Major - expensesTotal30,
    },
    salesTrend,
    ordersTrend,
    salesByDayOfWeek,
    topProducts: topProducts
      .filter((p: { _id: unknown }) => p._id)
      .map((p: { _id: { toString(): string }; name: string; value: number; secondary: number }) => ({
        id: p._id.toString(),
        name: p.name,
        value: money(p.value),
        secondary: p.secondary,
      })),
    lowStockProducts,
    appointmentsTrend,
    revenueVsExpenses,
  };
}

export async function buildEmployeePosDashboard(
  businessId: Types.ObjectId,
  employeeId: Types.ObjectId,
  employeeName: string,
  trendDays = 14,
  pricesAreMinor = false,
) {
  const money = (n: number) => fromStoredMoney(n, pricesAreMinor);
  const days = Math.min(Math.max(trendDays, 7), 90);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const yesterdayEnd = new Date(todayEnd.getTime() - DAY_MS);
  const last7Start = new Date(todayStart.getTime() - 6 * DAY_MS);
  const last30Start = new Date(todayStart.getTime() - 29 * DAY_MS);

  const employeeMatch = { businessId, employeeId, status: "FINALIZED" as const };

  const [salesToday, salesYesterday, sales7, sales30, salesTrendRows] = await Promise.all([
    sumSales(businessId, todayStart, todayEnd, employeeId),
    sumSales(businessId, yesterdayStart, yesterdayEnd, employeeId),
    sumSales(businessId, last7Start, undefined, employeeId),
    sumSales(businessId, last30Start, undefined, employeeId),
    Sale.aggregate([
      {
        $match: {
          ...employeeMatch,
          createdAt: { $gte: new Date(todayStart.getTime() - (days - 1) * DAY_MS) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const trendKeys = lastNDays(days);
  const salesTrend = mergeDailySeries(trendKeys, salesTrendRows).map(({ label, value, count }) => ({
    label,
    value: money(value),
    count,
  }));
  const ordersTrend = salesTrend.map(({ label, count }) => ({ label, value: count, count }));

  const salesTodayMajor = money(salesToday.total);
  const salesYesterdayMajor = money(salesYesterday.total);
  const sales7Major = money(sales7.total);
  const sales30Major = money(sales30.total);
  const avgOrderValue30Days = sales30.count > 0 ? sales30Major / sales30.count : 0;

  let salesTodayChangePercent = 0;
  if (salesYesterdayMajor > 0) {
    salesTodayChangePercent =
      ((salesTodayMajor - salesYesterdayMajor) / salesYesterdayMajor) * 100;
  } else if (salesTodayMajor > 0) {
    salesTodayChangePercent = 100;
  }

  return {
    employeeName,
    kpis: {
      salesToday: salesTodayMajor,
      salesYesterday: salesYesterdayMajor,
      salesTodayChangePercent,
      salesLast7Days: sales7Major,
      salesLast30Days: sales30Major,
      ordersToday: salesToday.count,
      ordersLast7Days: sales7.count,
      avgOrderValue30Days,
    },
    salesTrend,
    ordersTrend,
  };
}
