import type { Types } from "mongoose";
import { PurchaseOrder } from "../models/procurement.js";
import { badRequest } from "../errors/appError.js";
import { applyStockMovement } from "./inventory.service.js";
import { writeAuditLog } from "./audit.service.js";

export async function receivePurchaseOrder(input: {
  businessId: Types.ObjectId;
  purchaseOrderId: string;
  lines: { productId: string; quantity: number }[];
  userId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  ipAddress?: string;
}) {
  const po = await PurchaseOrder.findOne({ _id: input.purchaseOrderId, businessId: input.businessId });
  if (!po) badRequest("Purchase order not found");
  if (po.status === "CANCELLED") badRequest("PO cancelled");

  for (const recv of input.lines) {
    const line = po.lines.find((l) => l.productId.toString() === recv.productId);
    if (!line) badRequest(`Product not on PO: ${recv.productId}`);

    const remaining = line.quantityOrdered - line.quantityReceived;
    if (recv.quantity > remaining) badRequest("Receive quantity exceeds ordered");

    line.quantityReceived += recv.quantity;

    await applyStockMovement({
      businessId: input.businessId,
      productId: line.productId,
      locationId: po.locationId,
      movementType: "PURCHASE",
      quantityDelta: recv.quantity,
      referenceType: "PurchaseOrder",
      referenceId: po._id.toString(),
      userId: input.userId,
      employeeId: input.employeeId,
      ipAddress: input.ipAddress,
    });
  }

  const allReceived = po.lines.every((l) => l.quantityReceived >= l.quantityOrdered);
  po.status = allReceived ? "RECEIVED" : "PARTIAL";
  await po.save();

  await writeAuditLog({
    businessId: input.businessId,
    userId: input.userId,
    employeeId: input.employeeId,
    ipAddress: input.ipAddress,
    action: "purchaseorder.update",
    entityType: "PurchaseOrder",
    entityId: po._id.toString(),
    metadata: { status: po.status },
  });

  return po;
}
