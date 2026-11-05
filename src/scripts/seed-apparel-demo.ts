import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Business } from "../models/Business.js";
import { seedApparelDemo } from "../services/seedApparelDemo.service.js";

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
    throw new Error(
      "No business in database. Run npm run seed:dev-users first or set SEED_BUSINESS_ID.",
    );
  }
  return business._id;
}

async function main(): Promise<void> {
  const historyDays = Number(process.env.SEED_HISTORY_DAYS ?? "30");
  if (!Number.isFinite(historyDays) || historyDays < 7) {
    throw new Error("SEED_HISTORY_DAYS must be a number >= 7");
  }

  await connectDatabase();
  const businessId = await resolveBusinessId();
  const business = await Business.findById(businessId);
  if (!business) throw new Error("Business not found");

  console.log(`Seeding Ventos Apparel demo (${historyDays} days) for: ${business.name} (${business._id})`);
  console.log("This replaces catalog + operational data for this business. Staff password: Pineapple1!");

  const result = await seedApparelDemo(businessId, { historyDays });

  console.log("Done.");
  console.log(JSON.stringify(result, null, 2));
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
