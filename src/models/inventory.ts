import { Schema, model, type Document, type Types } from "mongoose";

export type StockMovementType =
  | "SALE"
  | "PURCHASE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT"
  | "RETURN";

export interface ILocation extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

locationSchema.index({ businessId: 1, name: 1 }, { unique: true });

export const Location = model<ILocation>("Location", locationSchema);

export interface IStockLevel extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  productId: Types.ObjectId;
  locationId: Types.ObjectId;
  quantity: number;
  updatedAt: Date;
}

const stockLevelSchema = new Schema<IStockLevel>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    quantity: { type: Number, required: true, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

stockLevelSchema.index({ businessId: 1, productId: 1, locationId: 1 }, { unique: true });

export const StockLevel = model<IStockLevel>("StockLevel", stockLevelSchema);

export interface IStockMovement extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  productId: Types.ObjectId;
  locationId: Types.ObjectId;
  movementType: StockMovementType;
  quantityDelta: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    movementType: {
      type: String,
      enum: ["SALE", "PURCHASE", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT", "RETURN"],
      required: true,
    },
    quantityDelta: { type: Number, required: true },
    referenceType: { type: String },
    referenceId: { type: String },
    notes: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ businessId: 1, createdAt: -1 });

export const StockMovement = model<IStockMovement>("StockMovement", stockMovementSchema);

export type StockTransferStatus = "DRAFT" | "COMPLETED" | "CANCELLED";

export interface IStockTransfer extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  fromLocationId: Types.ObjectId;
  toLocationId: Types.ObjectId;
  status: StockTransferStatus;
  lines: { productId: Types.ObjectId; quantity: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const stockTransferSchema = new Schema<IStockTransfer>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    fromLocationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    toLocationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    status: { type: String, enum: ["DRAFT", "COMPLETED", "CANCELLED"], default: "DRAFT" },
    lines: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
  },
  { timestamps: true },
);

export const StockTransfer = model<IStockTransfer>("StockTransfer", stockTransferSchema);
