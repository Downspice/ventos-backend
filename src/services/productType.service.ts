import type { Types } from "mongoose";
import { ProductType } from "../models/ProductType.js";
import { ProductMetadataField } from "../models/ProductMetadataField.js";
import { Product } from "../models/catalog.js";
import { badRequest } from "../errors/appError.js";

export function mapProductType(row: InstanceType<typeof ProductType>) {
  return {
    id: row._id.toString(),
    name: row.name,
    description: row.description ?? null,
    sortOrder: row.sortOrder,
    active: row.active !== false,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listProductTypes(businessId: Types.ObjectId, includeInactive = false) {
  const query = includeInactive
    ? { businessId }
    : { businessId, active: { $ne: false } };
  return ProductType.find(query).sort({ sortOrder: 1, name: 1 });
}

export async function assertProductTypeForBusiness(businessId: Types.ObjectId, productTypeId: string) {
  const row = await ProductType.findOne({ _id: productTypeId, businessId });
  if (!row) badRequest("Product type not found");
  return row;
}

export async function deleteProductType(businessId: Types.ObjectId, id: string) {
  const row = await ProductType.findOne({ _id: id, businessId });
  if (!row) badRequest("Product type not found");
  const productCount = await Product.countDocuments({ businessId, productTypeId: row._id });
  if (productCount > 0) {
    badRequest("Cannot delete a product type that is still assigned to products");
  }
  await ProductMetadataField.deleteMany({ businessId, productTypeId: row._id });
  await row.deleteOne();
  return true;
}
