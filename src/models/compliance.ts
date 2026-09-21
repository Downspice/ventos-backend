import { Schema, model, type Document, type Types } from "mongoose";

export interface IFraudRule extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  ruleType: "LARGE_DISCOUNT" | "VOID_VELOCITY" | "CUSTOM";
  threshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fraudRuleSchema = new Schema<IFraudRule>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    ruleType: {
      type: String,
      enum: ["LARGE_DISCOUNT", "VOID_VELOCITY", "CUSTOM"],
      required: true,
    },
    threshold: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const FraudRule = model<IFraudRule>("FraudRule", fraudRuleSchema);

export interface IActivityFlag extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  ruleId?: Types.ObjectId;
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  metadata?: Record<string, unknown>;
  resolvedAt?: Date;
  createdAt: Date;
}

const activityFlagSchema = new Schema<IActivityFlag>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    ruleId: { type: Schema.Types.ObjectId, ref: "FraudRule" },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    resolvedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const ActivityFlag = model<IActivityFlag>("ActivityFlag", activityFlagSchema);

export interface ISyncQueueItem extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  userId: Types.ObjectId;
  entityType: string;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  clientUpdatedAt: Date;
  syncedAt?: Date;
  createdAt: Date;
}

const syncQueueSchema = new Schema<ISyncQueueItem>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    operation: { type: String, enum: ["CREATE", "UPDATE", "DELETE"], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    clientUpdatedAt: { type: Date, required: true },
    syncedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SyncQueueItem = model<ISyncQueueItem>("SyncQueueItem", syncQueueSchema);
