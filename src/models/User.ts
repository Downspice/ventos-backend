import { Schema, model, type Document, type Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  email: string;
  name?: string;
  avatarUrl?: string;
  passwordHash?: string;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    avatarUrl: { type: String },
    passwordHash: { type: String },
    googleId: { type: String, sparse: true },
  },
  { timestamps: true },
);

userSchema.index({ businessId: 1, email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

export const User = model<IUser>("User", userSchema);
