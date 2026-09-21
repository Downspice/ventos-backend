import { Schema, model, type Document, type Types } from "mongoose";
import { documentLifecycleSchema, type DocumentLifecycleFields } from "./shared/documentLifecycle.js";

export interface IProductCategory extends Document, DocumentLifecycleFields {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  description?: string;
  parentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productCategorySchema = new Schema<IProductCategory>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "ProductCategory" },
    ...documentLifecycleSchema,
  },
  { timestamps: true },
);

productCategorySchema.index({ businessId: 1, name: 1 }, { unique: true });

export const ProductCategory = model<IProductCategory>("ProductCategory", productCategorySchema);

export type ProductDiscountType = "NONE" | "PERCENT" | "FIXED";

export interface IProduct extends Document, DocumentLifecycleFields {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  categoryId?: Types.ObjectId;
  productTypeId?: Types.ObjectId;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost: number;
  trackInventory: boolean;
  isActive: boolean;
  imageUrl?: string;
  /** Compact attribute values keyed by ProductMetadataField.key (strings only). */
  metadata?: Map<string, string>;
  expiryDate?: Date;
  discountType: ProductDiscountType;
  /** Percent 0–100 when discountType is PERCENT; minor units when FIXED. */
  discountValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "ProductCategory" },
    productTypeId: { type: Schema.Types.ObjectId, ref: "ProductType", index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    barcode: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    trackInventory: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    imageUrl: { type: String, trim: true },
    metadata: { type: Map, of: String },
    expiryDate: { type: Date },
    discountType: { type: String, enum: ["NONE", "PERCENT", "FIXED"], default: "NONE" },
    discountValue: { type: Number, default: 0, min: 0 },
    ...documentLifecycleSchema,
  },
  { timestamps: true },
);

productSchema.index(
  { businessId: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: { sku: { $exists: true, $type: "string" } },
  },
);
productSchema.index(
  { businessId: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: { barcode: { $exists: true, $type: "string" } },
  },
);

export const Product = model<IProduct>("Product", productSchema);

export interface IService extends Document, DocumentLifecycleFields {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    imageUrl: { type: String, trim: true },
    ...documentLifecycleSchema,
  },
  { timestamps: true },
);

serviceSchema.index({ businessId: 1, name: 1 }, { unique: true });

export const Service = model<IService>("Service", serviceSchema);
