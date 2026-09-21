import type { Types } from "mongoose";
import {
  Location,
  StockLevel,
  StockMovement,
  StockTransfer,
  type StockMovementType,
} from "../models/inventory.js";
import { badRequest } from "../errors/appError.js";
import { writeAuditLog } from "./audit.service.js";

export async function applyStockMovement(input: {
  businessId: Types.ObjectId;
  productId: Types.ObjectId;
  locationId: Types.ObjectId;
  movementType: StockMovementType;
  quantityDelta: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  userId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  ipAddress?: string;
}) {
  if (input.quantityDelta === 0) badRequest("Quantity delta cannot be zero");

  const level =
    (await StockLevel.findOne({
      businessId: input.businessId,
      productId: input.productId,
      locationId: input.locationId,
    })) ??
    (await StockLevel.create({
      businessId: input.businessId,
      productId: input.productId,
      locationId: input.locationId,
      quantity: 0,
    }));

  const nextQty = level.quantity + input.quantityDelta;
  if (nextQty < 0) badRequest("Insufficient stock");

  level.quantity = nextQty;
  await level.save();

  const movement = await StockMovement.create({
    businessId: input.businessId,
    productId: input.productId,
    locationId: input.locationId,
    movementType: input.movementType,
    quantityDelta: input.quantityDelta,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    notes: input.notes,
  });

  await writeAuditLog({
    businessId: input.businessId,
    userId: input.userId,
    employeeId: input.employeeId,
    ipAddress: input.ipAddress,
    action: "inventory.movement",
    entityType: "StockMovement",
    entityId: movement._id.toString(),
    metadata: { movementType: input.movementType, quantityDelta: input.quantityDelta },
  });

  return movement;
}

export async function completeStockTransfer(
  businessId: Types.ObjectId,
  transferId: string,
  userId?: Types.ObjectId,
  employeeId?: Types.ObjectId,
  ipAddress?: string,
) {
  const transfer = await StockTransfer.findOne({ _id: transferId, businessId });
  if (!transfer) badRequest("Transfer not found");
  if (transfer.status !== "DRAFT") badRequest("Transfer already processed");

  for (const line of transfer.lines) {
    await applyStockMovement({
      businessId,
      productId: line.productId,
      locationId: transfer.fromLocationId,
      movementType: "TRANSFER_OUT",
      quantityDelta: -line.quantity,
      referenceType: "StockTransfer",
      referenceId: transfer._id.toString(),
      userId,
      employeeId,
      ipAddress,
    });
    await applyStockMovement({
      businessId,
      productId: line.productId,
      locationId: transfer.toLocationId,
      movementType: "TRANSFER_IN",
      quantityDelta: line.quantity,
      referenceType: "StockTransfer",
      referenceId: transfer._id.toString(),
      userId,
      employeeId,
      ipAddress,
    });
  }

  transfer.status = "COMPLETED";
  await transfer.save();
  return transfer;
}

export async function getDefaultLocation(businessId: Types.ObjectId) {
  const loc = await Location.findOne({ businessId, isDefault: true });
  if (!loc) badRequest("No default location configured");
  return loc;
}
