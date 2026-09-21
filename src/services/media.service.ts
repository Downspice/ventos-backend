import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { Employee } from "../models/Employee.js";
import { Product, Service } from "../models/catalog.js";
import {
  MEDIA_ENTITY_TYPES,
  MediaAsset,
  type IMediaAsset,
  type MediaEntityType,
} from "../models/MediaAsset.js";
import { Customer } from "../models/sales.js";
import { badRequest } from "../errors/appError.js";
import { notDeletedFilter } from "../models/shared/documentLifecycle.js";
import type { GraphQLContext } from "../graphql/context.js";
import {
  auditEntityCreate,
  auditEntityUpdate,
  softDeleteDocument,
  stampUpdatedBy,
} from "./documentLifecycle.service.js";
import { uploadPublicFile } from "./storage.service.js";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(0, 120) || "image";
}

export function mapMediaAsset(row: IMediaAsset) {
  return {
    id: row._id.toString(),
    businessId: row.businessId.toString(),
    filename: row.filename,
    url: row.url,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    altText: row.altText ?? null,
    entityType: row.entityType ?? null,
    entityId: row.entityId?.toString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertEntityExists(
  businessId: Types.ObjectId,
  entityType: MediaEntityType,
  entityId: string,
) {
  const oid = new Types.ObjectId(entityId);
  switch (entityType) {
    case "BUSINESS": {
      if (oid.toString() !== businessId.toString()) badRequest("Business not found");
      break;
    }
    case "PRODUCT": {
      const row = await Product.findOne(notDeletedFilter({ _id: oid, businessId }));
      if (!row) badRequest("Product not found");
      break;
    }
    case "SERVICE": {
      const row = await Service.findOne(notDeletedFilter({ _id: oid, businessId }));
      if (!row) badRequest("Service not found");
      break;
    }
    case "EMPLOYEE": {
      const row = await Employee.findOne(notDeletedFilter({ _id: oid, businessId }));
      if (!row) badRequest("Employee not found");
      break;
    }
    case "CUSTOMER": {
      const row = await Customer.findOne(notDeletedFilter({ _id: oid, businessId }));
      if (!row) badRequest("Customer not found");
      break;
    }
    default:
      badRequest("Invalid entity type");
  }
}

function parseEntity(input: { entityType?: string | null; entityId?: string | null }) {
  const entityType = input.entityType?.trim() as MediaEntityType | undefined;
  const entityId = input.entityId?.trim();
  if (!entityType && !entityId) {
    return { entityType: undefined, entityId: undefined };
  }
  if (!entityType || !entityId) {
    badRequest("Both entityType and entityId are required to link media");
  }
  if (!MEDIA_ENTITY_TYPES.includes(entityType)) {
    badRequest("Invalid entity type");
  }
  return { entityType, entityId };
}

export async function listMediaAssets(
  businessId: Types.ObjectId,
  filter: { entityType?: string | null; entityId?: string | null; search?: string | null },
) {
  const query: Record<string, unknown> = notDeletedFilter({ businessId });
  if (filter.entityType) query.entityType = filter.entityType;
  if (filter.entityId) query.entityId = new Types.ObjectId(filter.entityId);
  if (filter.search?.trim()) {
    query.$or = [
      { filename: { $regex: filter.search.trim(), $options: "i" } },
      { altText: { $regex: filter.search.trim(), $options: "i" } },
    ];
  }
  const rows = await MediaAsset.find(query).sort({ createdAt: -1 }).limit(200);
  return rows.map(mapMediaAsset);
}

export async function createMediaAsset(
  businessId: Types.ObjectId,
  userId: Types.ObjectId,
  input: {
    filename: string;
    mimeType: string;
    dataBase64: string;
    altText?: string | null;
    entityType?: string | null;
    entityId?: string | null;
  },
  ctx?: GraphQLContext,
) {
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!ALLOWED_MIME.has(mimeType)) {
    badRequest("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }

  const raw = input.dataBase64.includes(",") ? input.dataBase64.split(",").pop()! : input.dataBase64;
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length === 0) badRequest("Empty file");
  if (buffer.length > MAX_BYTES) badRequest("File exceeds 5 MB limit");

  const link = parseEntity(input);
  if (link.entityType && link.entityId) {
    await assertEntityExists(businessId, link.entityType, link.entityId);
  }

  const assetId = randomUUID();
  const filename = input.filename.trim() || "image";
  const storagePath = `${businessId.toString()}/media/${assetId}-${sanitizeFilename(filename)}`;

  let url: string;
  const uploaded = await uploadPublicFile(storagePath, buffer, mimeType);
  if (uploaded) {
    url = uploaded.publicUrl;
  } else {
    url = `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  const row = await MediaAsset.create({
    businessId,
    uploadedBy: userId,
    filename,
    storagePath,
    url,
    mimeType,
    sizeBytes: buffer.length,
    altText: input.altText?.trim() || undefined,
    entityType: link.entityType,
    entityId: link.entityId ? new Types.ObjectId(link.entityId) : undefined,
  });

  if (ctx) {
    await auditEntityCreate(ctx, "MediaAsset", row._id.toString(), { filename: row.filename });
  }

  return mapMediaAsset(row);
}

export async function updateMediaAsset(
  businessId: Types.ObjectId,
  id: string,
  input: {
    altText?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    clearEntityLink?: boolean | null;
  },
  ctx?: GraphQLContext,
) {
  const row = await MediaAsset.findOne(notDeletedFilter({ _id: id, businessId }));
  if (!row) badRequest("Media not found");

  if (input.altText !== undefined) {
    row.altText = input.altText?.trim() || undefined;
  }

  if (input.clearEntityLink) {
    row.entityType = undefined;
    row.entityId = undefined;
  } else if (input.entityType !== undefined || input.entityId !== undefined) {
    const link = parseEntity({
      entityType: input.entityType,
      entityId: input.entityId,
    });
    if (link.entityType && link.entityId) {
      await assertEntityExists(businessId, link.entityType, link.entityId);
      row.entityType = link.entityType;
      row.entityId = new Types.ObjectId(link.entityId);
    }
  }

  if (ctx) await stampUpdatedBy(row, ctx);
  await row.save();
  if (ctx) {
    await auditEntityUpdate(ctx, "MediaAsset", id);
  }
  return mapMediaAsset(row);
}

export async function linkMediaByUrlToEntity(
  businessId: Types.ObjectId,
  imageUrl: string,
  entityType: MediaEntityType,
  entityId: string,
) {
  const trimmed = imageUrl.trim();
  if (!trimmed) return;
  await assertEntityExists(businessId, entityType, entityId);
  await MediaAsset.updateMany(
    { businessId, entityType, entityId: new Types.ObjectId(entityId), deleted: { $ne: true } },
    { $unset: { entityType: "", entityId: "" } },
  );
  await MediaAsset.updateOne(
    { businessId, url: trimmed, deleted: { $ne: true } },
    { entityType, entityId: new Types.ObjectId(entityId) },
  );
}

export async function deleteMediaAsset(businessId: Types.ObjectId, id: string, ctx: GraphQLContext) {
  const row = await MediaAsset.findOne(notDeletedFilter({ _id: id, businessId }));
  if (!row) badRequest("Media not found");
  await softDeleteDocument(row, ctx, "MediaAsset", id);
  return true;
}
