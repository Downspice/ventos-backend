import { Schema, model, type Document, type Types } from "mongoose";

export interface IExpense extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  category: string;
  amount: number;
  description?: string;
  incurredAt: Date;
  createdAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String },
    incurredAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Expense = model<IExpense>("Expense", expenseSchema);

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  invoiceNumber: string;
  saleId?: Types.ObjectId;
  purchaseOrderId?: Types.ObjectId;
  customerId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  status: InvoiceStatus;
  total: number;
  issuedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    invoiceNumber: { type: String, required: true, trim: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    status: { type: String, enum: ["DRAFT", "ISSUED", "PAID", "VOID"], default: "DRAFT" },
    total: { type: Number, required: true, min: 0 },
    issuedAt: { type: Date },
  },
  { timestamps: true },
);

invoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });

export const Invoice = model<IInvoice>("Invoice", invoiceSchema);
