import { Schema, model, type Document, type Types } from "mongoose";

export type ProductMetadataValueType = "TEXT" | "NUMBER" | "SELECT";

export interface IProductMetadataField extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  /** When set, field applies only to products of this type. */
  productTypeId?: Types.ObjectId;
  key: string;
  label: string;
  valueType: ProductMetadataValueType;
  unit?: string;
  options: string[];
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productMetadataFieldSchema = new Schema<IProductMetadataField>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    productTypeId: { type: Schema.Types.ObjectId, ref: "ProductType", index: true },
    key: { type: String, required: true, trim: true, maxlength: 32 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    valueType: { type: String, enum: ["TEXT", "NUMBER", "SELECT"], required: true },
    unit: { type: String, trim: true, maxlength: 16 },
    options: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productMetadataFieldSchema.index({ businessId: 1, productTypeId: 1, key: 1 }, { unique: true });
productMetadataFieldSchema.index({ businessId: 1, productTypeId: 1, sortOrder: 1 });

export const ProductMetadataField = model<IProductMetadataField>(
  "ProductMetadataField",
  productMetadataFieldSchema,
);
