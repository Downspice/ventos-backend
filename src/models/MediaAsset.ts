import { Schema, model, type Document, type Types } from "mongoose";
import { documentLifecycleSchema, type DocumentLifecycleFields } from "./shared/documentLifecycle.js";

export const MEDIA_ENTITY_TYPES = [
  "BUSINESS",
  "PRODUCT",
  "SERVICE",
  "EMPLOYEE",
  "CUSTOMER",
] as const;

export type MediaEntityType = (typeof MEDIA_ENTITY_TYPES)[number];

export interface IMediaAsset extends Document, DocumentLifecycleFields {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  filename: string;
  storagePath: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string;
  entityType?: MediaEntityType;
  entityId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true, trim: true },
    storagePath: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    altText: { type: String, trim: true },
    entityType: { type: String, enum: MEDIA_ENTITY_TYPES },
    entityId: { type: Schema.Types.ObjectId },
    ...documentLifecycleSchema,
  },
  { timestamps: true },
);

mediaAssetSchema.index({ businessId: 1, entityType: 1, entityId: 1 });
mediaAssetSchema.index({ businessId: 1, createdAt: -1 });

export const MediaAsset = model<IMediaAsset>("MediaAsset", mediaAssetSchema);
