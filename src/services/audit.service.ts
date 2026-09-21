import type { Request } from "express";
import type { Types } from "mongoose";
import type { GraphQLContext } from "../graphql/context.js";
import { AuditLog } from "../models/AuditLog.js";

type AuditInput = {
  businessId: Types.ObjectId;
  userId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  ipAddress?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditContext = Pick<GraphQLContext, "req" | "user" | "employee" | "businessId">;

export function clientIpFromRequest(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(forwarded)) {
    const first = forwarded[0]?.split(",")[0]?.trim();
    if (first) return first;
  }
  const ip = req.ip || req.socket?.remoteAddress;
  return ip || undefined;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await AuditLog.create(input);
}

export async function writeAuditLogFromContext(
  ctx: AuditContext,
  input: Omit<AuditInput, "businessId" | "userId" | "employeeId" | "ipAddress"> & {
    businessId?: Types.ObjectId;
  },
): Promise<void> {
  const businessId = input.businessId ?? ctx.businessId;
  if (!businessId) return;
  await writeAuditLog({
    ...input,
    businessId,
    userId: ctx.user?._id,
    employeeId: ctx.employee?._id,
    ipAddress: clientIpFromRequest(ctx.req),
  });
}
