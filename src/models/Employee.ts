import { Schema, model, type Document, type Types } from "mongoose";
import { documentLifecycleSchema, type DocumentLifecycleFields } from "./shared/documentLifecycle.js";

export interface IEmployee extends Document, DocumentLifecycleFields {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  userId?: Types.ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  /** Preset path `/avatars/xx.png` or HTTPS profile photo URL. */
  avatarUrl?: string;
  roleIds: Types.ObjectId[];
  isActive: boolean;
  /** Bcrypt hash for POS PIN sign-in (staff without separate user login). */
  posPinHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", sparse: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    roleIds: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    isActive: { type: Boolean, default: true },
    posPinHash: { type: String, select: false },
    ...documentLifecycleSchema,
  },
  { timestamps: true },
);

employeeSchema.index({ businessId: 1, userId: 1 }, { unique: true, sparse: true });

export const Employee = model<IEmployee>("Employee", employeeSchema);
