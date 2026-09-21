import { Schema, model, type Document, type Types } from "mongoose";
import type { CurrencyCode } from "../constants/currency.js";

export interface IBusiness extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  currency: CurrencyCode;
  /** When true, monetary amounts in MongoDB are integer minor units (pesewas / cents). */
  monetaryStorageMinor: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    logoUrl: { type: String },
    currency: { type: String, enum: ["GHS", "USD"], default: "GHS" },
    monetaryStorageMinor: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Business = model<IBusiness>("Business", businessSchema);
