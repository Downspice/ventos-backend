import type { Types } from "mongoose";
import { ProductMetadataField, type ProductMetadataValueType } from "../models/ProductMetadataField.js";
import { ProductType } from "../models/ProductType.js";
import { Product } from "../models/catalog.js";
import { badRequest } from "../errors/appError.js";

type SuggestedFieldDef = {
  key: string;
  label: string;
  valueType: ProductMetadataValueType;
  unit?: string;
  options?: string[];
  sortOrder: number;
};

const SUGGESTED_FIELDS_BY_TYPE: Record<string, SuggestedFieldDef[]> = {
  Beverage: [
    { key: "size", label: "Size", valueType: "TEXT", sortOrder: 0 },
    { key: "capacity", label: "Liquid capacity", valueType: "NUMBER", unit: "ml", sortOrder: 1 },
    {
      key: "packaging",
      label: "Packaging",
      valueType: "SELECT",
      options: ["Bottle", "Can", "Box", "Pouch"],
      sortOrder: 2,
    },
  ],
  Food: [
    { key: "size", label: "Size", valueType: "TEXT", sortOrder: 0 },
    { key: "weight", label: "Weight", valueType: "NUMBER", unit: "g", sortOrder: 1 },
    {
      key: "packaging",
      label: "Packaging",
      valueType: "SELECT",
      options: ["Box", "Pouch", "Bulk", "Tray"],
      sortOrder: 2,
    },
  ],
  Cosmetic: [
    { key: "size", label: "Size", valueType: "TEXT", sortOrder: 0 },
    { key: "colour", label: "Colour", valueType: "TEXT", sortOrder: 1 },
    { key: "volume", label: "Volume", valueType: "NUMBER", unit: "ml", sortOrder: 2 },
  ],
  Other: [
    { key: "size", label: "Size", valueType: "TEXT", sortOrder: 0 },
    { key: "colour", label: "Colour", valueType: "TEXT", sortOrder: 1 },
  ],
};

const DEFAULT_PRODUCT_TYPE_NAMES = ["Beverage", "Food", "Cosmetic", "Other"] as const;

export function slugifyMetadataKey(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
  return base || "field";
}

export async function seedSuggestedProductMetadataFields(businessId: Types.ObjectId): Promise<number> {
  let created = 0;
  for (let i = 0; i < DEFAULT_PRODUCT_TYPE_NAMES.length; i++) {
    const name = DEFAULT_PRODUCT_TYPE_NAMES[i];
    let typeRow = await ProductType.findOne({ businessId, name });
    if (!typeRow) {
      typeRow = await ProductType.create({
        businessId,
        name,
        sortOrder: i,
        active: true,
      });
      created++;
    }
    const defs = SUGGESTED_FIELDS_BY_TYPE[name] ?? [];
    for (const def of defs) {
      const existing = await ProductMetadataField.findOne({
        businessId,
        productTypeId: typeRow._id,
        key: def.key,
      });
      if (existing) continue;
      await ProductMetadataField.create({
        businessId,
        productTypeId: typeRow._id,
        key: def.key,
        label: def.label,
        valueType: def.valueType,
        unit: def.unit,
        options: def.options ?? [],
        sortOrder: def.sortOrder,
        active: true,
      });
      created++;
    }
  }
  return created;
}

export async function listActiveMetadataFields(
  businessId: Types.ObjectId,
  productTypeId?: Types.ObjectId | null,
) {
  const query: Record<string, unknown> = { businessId, active: { $ne: false } };
  if (productTypeId) {
    query.productTypeId = productTypeId;
  }
  return ProductMetadataField.find(query).sort({ sortOrder: 1, label: 1 });
}

export async function listAllMetadataFields(
  businessId: Types.ObjectId,
  productTypeId?: Types.ObjectId | null,
) {
  const query: Record<string, unknown> = { businessId };
  if (productTypeId) {
    query.productTypeId = productTypeId;
  }
  return ProductMetadataField.find(query).sort({ sortOrder: 1, label: 1 });
}

export function metadataMapToRecord(metadata?: Map<string, string> | Record<string, string> | null) {
  if (!metadata) return null;
  if (metadata instanceof Map) {
    if (metadata.size === 0) return null;
    return Object.fromEntries(metadata.entries());
  }
  const entries = Object.entries(metadata).filter(([, v]) => v != null && String(v).trim() !== "");
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export async function normalizeProductMetadata(
  businessId: Types.ObjectId,
  raw: Record<string, unknown> | null | undefined,
  productTypeId?: Types.ObjectId | null,
): Promise<Map<string, string> | undefined> {
  if (!raw || typeof raw !== "object") return undefined;

  const fields = await listActiveMetadataFields(businessId, productTypeId ?? undefined);
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const out = new Map<string, string>();

  for (const [key, value] of Object.entries(raw)) {
    if (value == null || String(value).trim() === "") continue;
    const field = byKey.get(key);
    if (!field) continue;

    const str = String(value).trim();
    if (field.valueType === "NUMBER") {
      const n = Number(str);
      if (!Number.isFinite(n)) badRequest(`Invalid number for ${field.label}`);
      out.set(key, String(n));
    } else if (field.valueType === "SELECT") {
      if (field.options.length > 0 && !field.options.includes(str)) {
        badRequest(`Invalid option for ${field.label}`);
      }
      out.set(key, str);
    } else {
      if (str.length > 200) badRequest(`${field.label} is too long`);
      out.set(key, str);
    }
  }

  return out.size > 0 ? out : undefined;
}

export function mapMetadataField(row: InstanceType<typeof ProductMetadataField>) {
  return {
    id: row._id.toString(),
    productTypeId: row.productTypeId?.toString() ?? null,
    key: row.key,
    label: row.label,
    valueType: row.valueType,
    unit: row.unit ?? null,
    options: row.options ?? [],
    sortOrder: row.sortOrder,
    active: row.active !== false,
  };
}

export async function stripMetadataKeyFromProducts(businessId: Types.ObjectId, key: string) {
  await Product.updateMany(
    { businessId, [`metadata.${key}`]: { $exists: true } },
    { $unset: { [`metadata.${key}`]: "" } },
  );
}
