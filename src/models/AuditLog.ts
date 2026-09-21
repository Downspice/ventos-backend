import { Schema, model, type Document, type Types } from "mongoose";

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  userId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  ipAddress?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    ipAddress: { type: String },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ businessId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
