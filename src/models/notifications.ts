import { Schema, model, type Document, type Types } from "mongoose";

export interface INotification extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  userId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  title: string;
  body: string;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Notification = model<INotification>("Notification", notificationSchema);
