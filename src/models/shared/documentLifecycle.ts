import { Schema, type Types } from "mongoose";

export type DocumentLifecycleFields = {
  deleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
};

export const documentLifecycleSchema = {
  deleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
};

export function notDeletedFilter<T extends Record<string, unknown>>(filter: T): T & { deleted: { $ne: true } } {
  return { ...filter, deleted: { $ne: true } };
}
