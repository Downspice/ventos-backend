import type { Types } from "mongoose";
import { Product, ProductCategory } from "../models/catalog.js";
import { ProductMetadataField } from "../models/ProductMetadataField.js";
import { ProductType } from "../models/ProductType.js";
import { Location, StockLevel, StockMovement } from "../models/inventory.js";
import { Business } from "../models/Business.js";
import { generateEAN13Seed } from "../integrations/barcode.js";
import { toStoredMoney } from "../utils/money.js";
import {
  DEMO_PRODUCT_TYPES,
  buildDemoProducts,
} from "./demoCatalog.data.js";

export type DemoCatalogStats = {
  typesCreated: number;
  fieldsCreated: number;
  productsCreated: number;
  stockRowsCreated: number;
  productsRemoved: number;
  typesRemoved: number;
  fieldsRemoved: number;
};

async function reconcileProductMetadataFieldIndexes(): Promise<void> {
  const coll = ProductMetadataField.collection;
  for (const idx of await coll.indexes()) {
    const name = idx.name;
    if (name === "businessId_1_key_1") {
      await coll.dropIndex(name).catch(() => undefined);
    }
  }
  await ProductMetadataField.syncIndexes();
}

export async function wipeProductCatalog(businessId: Types.ObjectId): Promise<{
  productsRemoved: number;
  typesRemoved: number;
  fieldsRemoved: number;
}> {
  await reconcileProductMetadataFieldIndexes();

  const productIds = await Product.find({ businessId }).distinct("_id");
  const [fieldsRemoved, typesRemoved, productsRemoved] = await Promise.all([
    ProductMetadataField.deleteMany({ businessId }).then((r) => r.deletedCount ?? 0),
    ProductType.deleteMany({ businessId }).then((r) => r.deletedCount ?? 0),
    Product.deleteMany({ businessId }).then((r) => r.deletedCount ?? 0),
  ]);
  if (productIds.length > 0) {
    await Promise.all([
      StockLevel.deleteMany({ businessId, productId: { $in: productIds } }),
      StockMovement.deleteMany({ businessId, productId: { $in: productIds } }),
    ]);
  }
  return { productsRemoved, typesRemoved, fieldsRemoved };
}

function metadataMapFromRecord(record: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(record));
}

function expiryDateFromDays(days?: number): Date | undefined {
  if (days == null) return undefined;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function storeDiscountValue(
  discountType: "NONE" | "PERCENT" | "FIXED",
  discountValue: number | undefined,
  pricesMinor: boolean,
): number {
  if (discountType === "NONE" || !discountValue) return 0;
  if (discountType === "PERCENT") return discountValue;
  return toStoredMoney(discountValue, pricesMinor);
}

export async function seedDemoCatalog(businessId: Types.ObjectId): Promise<DemoCatalogStats> {
  const business = await Business.findById(businessId);
  if (!business) throw new Error("Business not found");

  const wiped = await wipeProductCatalog(businessId);
  const pricesMinor = business.monetaryStorageMinor !== false;

  const typeByName = new Map<string, Types.ObjectId>();
  let fieldsCreated = 0;

  for (const typeDef of DEMO_PRODUCT_TYPES) {
    const typeRow = await ProductType.create({
      businessId,
      name: typeDef.name,
      description: typeDef.description,
      sortOrder: typeDef.sortOrder,
      active: true,
    });
    typeByName.set(typeDef.name, typeRow._id);

    for (const field of typeDef.fields) {
      await ProductMetadataField.create({
        businessId,
        productTypeId: typeRow._id,
        key: field.key,
        label: field.label,
        valueType: field.valueType,
        unit: field.unit,
        options: field.options ?? [],
        sortOrder: field.sortOrder,
        active: true,
      });
      fieldsCreated++;
    }
  }

  const productDefs = buildDemoProducts();
  const defaultLocation =
    (await Location.findOne({ businessId, isDefault: true })) ??
    (await Location.create({ businessId, name: "Main", isDefault: true }));

  let productsCreated = 0;
  let stockRowsCreated = 0;

  for (const def of productDefs) {
    const typeId = typeByName.get(def.typeName);
    if (!typeId) continue;

    const discountType = def.discountType ?? "NONE";
    const product = await Product.create({
      businessId,
      productTypeId: typeId,
      name: def.name,
      sku: def.sku,
      barcode: generateEAN13Seed(),
      price: toStoredMoney(def.price, pricesMinor),
      cost: toStoredMoney(def.cost, pricesMinor),
      trackInventory: def.trackInventory ?? true,
      isActive: true,
      metadata: metadataMapFromRecord(def.metadata),
      expiryDate: expiryDateFromDays(def.expiryDaysFromNow),
      discountType,
      discountValue: storeDiscountValue(discountType, def.discountValue, pricesMinor),
    });
    productsCreated++;

    if (product.trackInventory) {
      const qty = 15 + Math.floor(Math.random() * 185);
      await StockLevel.create({
        businessId,
        productId: product._id,
        locationId: defaultLocation._id,
        quantity: qty,
      });
      stockRowsCreated++;
    }
  }

  return {
    typesCreated: DEMO_PRODUCT_TYPES.length,
    fieldsCreated,
    productsCreated,
    stockRowsCreated,
    ...wiped,
  };
}

/** Optional grocery categories for filters (does not wipe existing categories). */
export async function ensureDemoProductCategories(businessId: Types.ObjectId): Promise<number> {
  const names = ["Grocery", "Chilled", "Health & Beauty", "Household", "Electronics"];
  let created = 0;
  for (const name of names) {
    const exists = await ProductCategory.findOne({ businessId, name });
    if (exists) continue;
    await ProductCategory.create({ businessId, name });
    created++;
  }
  return created;
}
