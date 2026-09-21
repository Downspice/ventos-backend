import { Schema, model, type Document, type Types } from "mongoose";
import { documentLifecycleSchema, type DocumentLifecycleFields } from "./shared/documentLifecycle.js";

export interface ISupplier extends Document, DocumentLifecycleFields {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    ...documentLifecycleSchema,
  },
  { timestamps: true },
);

supplierSchema.index({ businessId: 1, name: 1 }, { unique: true });

export const Supplier = model<ISupplier>("Supplier", supplierSchema);

export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";

export interface IPurchaseOrder extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  supplierId: Types.ObjectId;
  locationId: Types.ObjectId;
  status: PurchaseOrderStatus;
  lines: {
    productId: Types.ObjectId;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    status: {
      type: String,
      enum: ["DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELLED"],
      default: "DRAFT",
    },
    lines: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantityOrdered: { type: Number, required: true, min: 1 },
        quantityReceived: { type: Number, default: 0, min: 0 },
        unitCost: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { timestamps: true },
);

export const PurchaseOrder = model<IPurchaseOrder>("PurchaseOrder", purchaseOrderSchema);
