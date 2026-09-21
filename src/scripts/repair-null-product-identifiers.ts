/**
 * Removes null/empty sku and barcode so sparse/partial unique indexes allow
 * multiple products without those fields.
 *
 * Usage: npx tsx src/scripts/repair-null-product-identifiers.ts
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Product } from "../models/catalog.js";

async function main() {
  await mongoose.connect(env.mongodbUri);

  const skuResult = await Product.updateMany(
    { $or: [{ sku: null }, { sku: "" }] },
    { $unset: { sku: "" } },
  );
  const barcodeResult = await Product.updateMany(
    { $or: [{ barcode: null }, { barcode: "" }] },
    { $unset: { barcode: "" } },
  );

  console.log(`Unset sku on ${skuResult.modifiedCount} product(s)`);
  console.log(`Unset barcode on ${barcodeResult.modifiedCount} product(s)`);

  await Product.syncIndexes();
  console.log("Product indexes synced");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
