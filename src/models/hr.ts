import { Schema, model, type Document, type Types } from "mongoose";

export interface IShift extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  employeeId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    notes: { type: String },
  },
  { timestamps: true },
);

export const Shift = model<IShift>("Shift", shiftSchema);

export interface IAttendanceRecord extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  employeeId: Types.ObjectId;
  clockInAt: Date;
  clockOutAt?: Date;
  createdAt: Date;
}

const attendanceSchema = new Schema<IAttendanceRecord>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    clockInAt: { type: Date, required: true },
    clockOutAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

attendanceSchema.index({ businessId: 1, employeeId: 1, clockInAt: -1 });

export const AttendanceRecord = model<IAttendanceRecord>("AttendanceRecord", attendanceSchema);

export interface IPerformanceMetric extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  employeeId: Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  salesTotal: number;
  appointmentCount: number;
  createdAt: Date;
}

const performanceSchema = new Schema<IPerformanceMetric>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    salesTotal: { type: Number, default: 0 },
    appointmentCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PerformanceMetric = model<IPerformanceMetric>("PerformanceMetric", performanceSchema);
