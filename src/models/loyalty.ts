import { Schema, model, type Document, type Types } from "mongoose";

export interface ILoyaltyRule extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  pointsPerCurrency: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyRuleSchema = new Schema<ILoyaltyRule>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    pointsPerCurrency: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const LoyaltyRule = model<ILoyaltyRule>("LoyaltyRule", loyaltyRuleSchema);

export interface ICustomerLoyaltyBalance extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  points: number;
  updatedAt: Date;
}

const loyaltyBalanceSchema = new Schema<ICustomerLoyaltyBalance>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    points: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

loyaltyBalanceSchema.index({ businessId: 1, customerId: 1 }, { unique: true });

export const CustomerLoyaltyBalance = model<ICustomerLoyaltyBalance>(
  "CustomerLoyaltyBalance",
  loyaltyBalanceSchema,
);
