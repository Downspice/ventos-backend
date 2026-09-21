import { Schema, model, type Document, type Types } from "mongoose";

export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface IAppointment extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  serviceIds: Types.ObjectId[];
  assignedEmployeeIds: Types.ObjectId[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"],
      default: "SCHEDULED",
    },
    serviceIds: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    assignedEmployeeIds: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    notes: { type: String },
  },
  { timestamps: true },
);

export const Appointment = model<IAppointment>("Appointment", appointmentSchema);

export interface IStaffServiceAssignment extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  employeeId: Types.ObjectId;
  serviceId: Types.ObjectId;
  createdAt: Date;
}

const staffServiceSchema = new Schema<IStaffServiceAssignment>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

staffServiceSchema.index({ businessId: 1, employeeId: 1, serviceId: 1 }, { unique: true });

export const StaffServiceAssignment = model<IStaffServiceAssignment>(
  "StaffServiceAssignment",
  staffServiceSchema,
);

export interface ICommissionRule extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  percent: number;
  appliesTo: "PRODUCT" | "SERVICE" | "ALL";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commissionRuleSchema = new Schema<ICommissionRule>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    percent: { type: Number, required: true, min: 0, max: 100 },
    appliesTo: { type: String, enum: ["PRODUCT", "SERVICE", "ALL"], default: "ALL" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const CommissionRule = model<ICommissionRule>("CommissionRule", commissionRuleSchema);

export interface ICommissionEntry extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  employeeId: Types.ObjectId;
  saleId?: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  amount: number;
  createdAt: Date;
}

const commissionEntrySchema = new Schema<ICommissionEntry>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const CommissionEntry = model<ICommissionEntry>("CommissionEntry", commissionEntrySchema);
