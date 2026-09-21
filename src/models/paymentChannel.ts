import { Schema, model, type Document, type Types } from "mongoose";
import { documentLifecycleSchema, type DocumentLifecycleFields } from "./shared/documentLifecycle.js";

export type PaymentChannelType = "BANK_ACCOUNT" | "MOBILE_MONEY";

export interface IPaymentChannel extends Document, DocumentLifecycleFields {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  type: PaymentChannelType;
  /** Bank: account holder name. Mobile money: name registered on the number. */
  name: string;
  accountNumber?: string;
  network?: string;
  number?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentChannelSchema = new Schema<IPaymentChannel>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    type: { type: String, enum: ["BANK_ACCOUNT", "MOBILE_MONEY"], required: true },
    name: { type: String, required: true, trim: true },
    accountNumber: { type: String, trim: true },
    network: { type: String, trim: true },
    number: { type: String, trim: true },
    ...documentLifecycleSchema,
  },
  { timestamps: true },
);

paymentChannelSchema.index({ businessId: 1, type: 1, createdAt: -1 });

export const PaymentChannel = model<IPaymentChannel>("PaymentChannel", paymentChannelSchema);
