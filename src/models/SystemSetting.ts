import { Schema, model, type Document, type Types } from "mongoose";

export interface ISystemSetting extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  namespace: string;
  key: string;
  value: unknown;
  updatedAt: Date;
}

const systemSettingSchema = new Schema<ISystemSetting>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    namespace: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

systemSettingSchema.index({ businessId: 1, namespace: 1, key: 1 }, { unique: true });

export const SystemSetting = model<ISystemSetting>("SystemSetting", systemSettingSchema);
