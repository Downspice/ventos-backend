import { Schema, model, type Document, type Types } from "mongoose";
import { documentLifecycleSchema, type DocumentLifecycleFields } from "./shared/documentLifecycle.js";

export interface IProductType extends Document, DocumentLifecycleFields {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productTypeSchema = new Schema<IProductType>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 240 },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    ...documentLifecycleSchema,
  },
  { timestamps: true },
);

productTypeSchema.index({ businessId: 1, name: 1 }, { unique: true });
productTypeSchema.index({ businessId: 1, sortOrder: 1 });

export const ProductType = model<IProductType>("ProductType", productTypeSchema);
