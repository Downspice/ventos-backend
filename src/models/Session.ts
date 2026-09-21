import { Schema, model, type Document, type Types } from "mongoose";

export interface ISession extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  userId: Types.ObjectId;
  refreshTokenHash: string;
  deviceLabel?: string;
  /** Staff member signed in on this POS session after device unlock. */
  activeEmployeeId?: Types.ObjectId;
  lastSeenAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    deviceLabel: { type: String, trim: true },
    activeEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    lastSeenAt: { type: Date, default: () => new Date() },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

export const Session = model<ISession>("Session", sessionSchema);
