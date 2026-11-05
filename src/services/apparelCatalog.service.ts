import type { Types } from "mongoose";
import { Product, ProductCategory } from "../models/catalog.js";
import { ProductMetadataField } from "../models/ProductMetadataField.js";
import { ProductType } from "../models/ProductType.js";
import { Location, StockLevel } from "../models/inventory.js";
import { Business } from "../models/Business.js";
import { generateEAN13Seed } from "../integrations/barcode.js";
import { toStoredMoney } from "../utils/money.js";
import { wipeProductCatalog, type DemoCatalogStats } from "./demoCatalog.service.js";
import {
  APPAREL_CATEGORIES,
  APPAREL_PRODUCT_TYPES,
  buildApparelProducts,
} from "./apparelCatalog.data.js";

export type ApparelCatalogStats = DemoCatalogStats & {
  categoriesCreated: number;
};

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

export async function wipeApparelCategories(businessId: Types.ObjectId): Promise<number> {
  const result = await ProductCategory.deleteMany({ businessId });
  return result.deletedCount ?? 0;
}

export async function seedApparelCatalog(businessId: Types.ObjectId): Promise<ApparelCatalogStats> {
  const business = await Business.findById(businessId);
  if (!business) throw new Error("Business not found");

  const wiped = await wipeProductCatalog(businessId);
  const categoriesRemoved = await wipeApparelCategories(businessId);
  void categoriesRemoved;

  const pricesMinor = business.monetaryStorageMinor !== false;

  const categoryByName = new Map<string, Types.ObjectId>();
  let categoriesCreated = 0;
  for (const name of APPAREL_CATEGORIES) {
    const row = await ProductCategory.create({ businessId, name });
    categoryByName.set(name, row._id);
    categoriesCreated++;
  }

  const typeByName = new Map<string, Types.ObjectId>();
  let fieldsCreated = 0;

  for (const typeDef of APPAREL_PRODUCT_TYPES) {
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

  const productDefs = buildApparelProducts();
  const defaultLocation =
    (await Location.findOne({ businessId, isDefault: true })) ??
    (await Location.create({ businessId, name: "Main", isDefault: true }));

  let productsCreated = 0;
  let stockRowsCreated = 0;

  for (const def of productDefs) {
    const typeId = typeByName.get(def.typeName);
    if (!typeId) continue;
    const categoryId = categoryByName.get(def.categoryName);

    const discountType = def.discountType ?? "NONE";
    const product = await Product.create({
      businessId,
      categoryId,
      productTypeId: typeId,
      name: def.name,
      sku: def.sku,
      barcode: generateEAN13Seed(),
      price: toStoredMoney(def.price, pricesMinor),
      cost: toStoredMoney(def.cost, pricesMinor),
      trackInventory: def.trackInventory ?? true,
      isActive: true,
      imageUrl: def.imageUrl,
      metadata: metadataMapFromRecord(def.metadata),
      expiryDate: expiryDateFromDays(def.expiryDaysFromNow),
      discountType,
      discountValue: storeDiscountValue(discountType, def.discountValue, pricesMinor),
    });
    productsCreated++;

    if (product.trackInventory) {
      const qty = 120 + Math.floor(Math.random() * 380);
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
    typesCreated: APPAREL_PRODUCT_TYPES.length,
    fieldsCreated,
    productsCreated,
    stockRowsCreated,
    categoriesCreated,
    ...wiped,
  };
}
