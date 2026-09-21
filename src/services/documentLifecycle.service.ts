import type { Types } from "mongoose";
import type { GraphQLContext } from "../graphql/context.js";
import { writeAuditLogFromContext } from "./audit.service.js";

type SoftDeleteDoc = {
  deleted?: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  save(): Promise<unknown>;
};

export async function stampUpdatedBy(doc: SoftDeleteDoc, ctx: GraphQLContext): Promise<void> {
  if (!ctx.user) return;
  doc.updatedBy = ctx.user._id;
}

export async function softDeleteDocument(
  doc: SoftDeleteDoc,
  ctx: GraphQLContext,
  entityType: string,
  entityId: string,
): Promise<void> {
  if (!ctx.user) return;
  const now = new Date();
  doc.deleted = true;
  doc.deletedAt = now;
  doc.deletedBy = ctx.user._id;
  doc.updatedBy = ctx.user._id;
  await doc.save();
  await writeAuditLogFromContext(ctx, {
    action: `${entityType.toLowerCase()}.delete`,
    entityType,
    entityId,
    metadata: { deleted: true, deletedAt: now.toISOString(), deletedBy: ctx.user._id.toString() },
  });
}

export async function auditEntityCreate(
  ctx: GraphQLContext,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!ctx.user || !ctx.businessId) return;
  await writeAuditLogFromContext(ctx, {
    action: `${entityType.toLowerCase()}.create`,
    entityType,
    entityId,
    metadata,
  });
}

export async function auditEntityUpdate(
  ctx: GraphQLContext,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!ctx.user || !ctx.businessId) return;
  await writeAuditLogFromContext(ctx, {
    action: `${entityType.toLowerCase()}.update`,
    entityType,
    entityId,
    metadata,
  });
}
