import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Business } from "../models/Business.js";
import {
  ensureDemoProductCategories,
  seedDemoCatalog,
} from "../services/demoCatalog.service.js";

async function resolveBusinessId(): Promise<mongoose.Types.ObjectId> {
  const fromEnv = process.env.SEED_BUSINESS_ID?.trim();
  if (fromEnv) {
    if (!mongoose.Types.ObjectId.isValid(fromEnv)) {
      throw new Error(`Invalid SEED_BUSINESS_ID: ${fromEnv}`);
    }
    return new mongoose.Types.ObjectId(fromEnv);
  }

  const slug = process.env.SEED_BUSINESS_SLUG?.trim();
  if (slug) {
    const business = await Business.findOne({ slug: slug.toLowerCase() });
    if (!business) throw new Error(`No business with slug: ${slug}`);
    return business._id;
  }

  const business = await Business.findOne().sort({ createdAt: 1 });
  if (!business) {
    throw new Error("No business in database. Register a business or set SEED_BUSINESS_ID.");
  }
  return business._id;
}

async function main(): Promise<void> {
  await connectDatabase();
  const businessId = await resolveBusinessId();
  const business = await Business.findById(businessId);
  if (!business) throw new Error("Business not found");

  console.log(`Seeding demo catalog for: ${business.name} (${business._id})`);
  console.log("Clearing existing products, types, and metadata fields…");

  const stats = await seedDemoCatalog(businessId);
  const categoriesAdded = await ensureDemoProductCategories(businessId);

  console.log("Done.");
  console.log(
    JSON.stringify(
      {
        removed: {
          products: stats.productsRemoved,
          types: stats.typesRemoved,
          metadataFields: stats.fieldsRemoved,
        },
        created: {
          types: stats.typesCreated,
          metadataFields: stats.fieldsCreated,
          products: stats.productsCreated,
          stockLevels: stats.stockRowsCreated,
          categories: categoriesAdded,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await disconnectDatabase();
  })
  .catch(async (error) => {
    console.error(error);
    await disconnectDatabase();
    process.exit(1);
  });
