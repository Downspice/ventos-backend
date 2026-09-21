import { Schema, model, type Document, type Types } from "mongoose";
import { documentLifecycleSchema, type DocumentLifecycleFields } from "./shared/documentLifecycle.js";

export interface ICustomer extends Document, DocumentLifecycleFields {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    ...documentLifecycleSchema,
  },
  { timestamps: true },
);

export const Customer = model<ICustomer>("Customer", customerSchema);

export interface ICashRegister extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  locationId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cashRegisterSchema = new Schema<ICashRegister>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

cashRegisterSchema.index({ businessId: 1, name: 1 }, { unique: true });

export const CashRegister = model<ICashRegister>("CashRegister", cashRegisterSchema);

export type RegisterSessionStatus = "OPEN" | "CLOSED";

export interface IRegisterSession extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  registerId: Types.ObjectId;
  openedByEmployeeId: Types.ObjectId;
  closedByEmployeeId?: Types.ObjectId;
  openingFloat: number;
  closingAmount?: number;
  status: RegisterSessionStatus;
  openedAt: Date;
  closedAt?: Date;
}

const registerSessionSchema = new Schema<IRegisterSession>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    registerId: { type: Schema.Types.ObjectId, ref: "CashRegister", required: true },
    openedByEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    closedByEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    openingFloat: { type: Number, default: 0, min: 0 },
    closingAmount: { type: Number, min: 0 },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
    openedAt: { type: Date, default: () => new Date() },
    closedAt: { type: Date },
  },
  { timestamps: false },
);

export const RegisterSession = model<IRegisterSession>("RegisterSession", registerSessionSchema);

export type SaleStatus = "DRAFT" | "FINALIZED" | "VOID";

export interface ISaleLine {
  lineType: "PRODUCT" | "SERVICE";
  productId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface ISale extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  customerId?: Types.ObjectId;
  registerSessionId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  status: SaleStatus;
  lines: ISaleLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

const saleSchema = new Schema<ISale>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    registerSessionId: { type: Schema.Types.ObjectId, ref: "RegisterSession" },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    status: { type: String, enum: ["DRAFT", "FINALIZED", "VOID"], default: "DRAFT" },
    lines: [
      {
        lineType: { type: String, enum: ["PRODUCT", "SERVICE"], required: true },
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        discountAmount: { type: Number, default: 0, min: 0 },
        lineTotal: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true },
);

saleSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });

export const Sale = model<ISale>("Sale", saleSchema);

export interface IPayment extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  saleId: Types.ObjectId;
  method: "CASH" | "CARD" | "TRANSFER" | "OTHER" | "BANK" | "MOBILE_MONEY";
  amount: number;
  reference?: string;
  paymentChannelId?: Types.ObjectId;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale", required: true, index: true },
    method: {
      type: String,
      enum: ["CASH", "CARD", "TRANSFER", "OTHER", "BANK", "MOBILE_MONEY"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String },
    paymentChannelId: { type: Schema.Types.ObjectId, ref: "PaymentChannel" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Payment = model<IPayment>("Payment", paymentSchema);

export interface IDiscountRule extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  type: "PERCENT" | "FIXED";
  value: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const discountRuleSchema = new Schema<IDiscountRule>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["PERCENT", "FIXED"], required: true },
    value: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const DiscountRule = model<IDiscountRule>("DiscountRule", discountRuleSchema);

export type TaxApplicationMode = "INCLUSIVE" | "EXCLUSIVE";

export interface ITaxRule extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  rate: number;
  mode: TaxApplicationMode;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taxRuleSchema = new Schema<ITaxRule>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0, max: 100 },
    mode: { type: String, enum: ["INCLUSIVE", "EXCLUSIVE"], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

taxRuleSchema.index({ businessId: 1, name: 1 }, { unique: true });

export const TaxRule = model<ITaxRule>("TaxRule", taxRuleSchema);

export type ReturnKind = "RETURN" | "REFUND";
export type ReturnStockDisposition = "RESTOCK" | "WASTE";

export interface IReturn extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  saleId: Types.ObjectId;
  lines: { productId: Types.ObjectId; quantity: number; refundAmount: number }[];
  totalRefund: number;
  kind: ReturnKind;
  stockDisposition: ReturnStockDisposition;
  reason?: string;
  createdAt: Date;
}

const returnSchema = new Schema<IReturn>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale", required: true },
    lines: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
        refundAmount: { type: Number, required: true, min: 0 },
      },
    ],
    totalRefund: { type: Number, required: true, min: 0 },
    kind: { type: String, enum: ["RETURN", "REFUND"], default: "RETURN" },
    stockDisposition: { type: String, enum: ["RESTOCK", "WASTE"], default: "RESTOCK" },
    reason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Return = model<IReturn>("Return", returnSchema);
