/**
 * One-off repair: some businesses ran legacy migration while amounts were already
 * in minor units, multiplying by 100 twice (e.g. 150 pesewas → 15000).
 * Divides product/service prices by 100 when they exceed a sane major-unit threshold.
 *
 * Usage: npx tsx src/scripts/repair-overscaled-prices.ts
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Product, Service } from "../models/catalog.js";
import { Business } from "../models/Business.js";

const MAJOR_CEILING = 1_000_000; // 10k GHS/USD in minor units without repair

async function main() {
  await mongoose.connect(env.mongodbUri);
  const businesses = await Business.find({ monetaryStorageMinor: { $ne: false } });
  for (const b of businesses) {
    const products = await Product.find({ businessId: b._id });
    for (const p of products) {
      if (p.price >= MAJOR_CEILING || p.cost >= MAJOR_CEILING) {
        const nextPrice = p.price >= MAJOR_CEILING ? Math.round(p.price / 100) : p.price;
        const nextCost = p.cost >= MAJOR_CEILING ? Math.round(p.cost / 100) : p.cost;
        console.log(`Product ${p.name}: price ${p.price} → ${nextPrice}, cost ${p.cost} → ${nextCost}`);
        p.price = nextPrice;
        p.cost = nextCost;
        await p.save();
      }
    }
    const services = await Service.find({ businessId: b._id });
    for (const s of services) {
      if (s.price >= MAJOR_CEILING) {
        const next = Math.round(s.price / 100);
        console.log(`Service ${s.name}: price ${s.price} → ${next}`);
        s.price = next;
        await s.save();
      }
    }
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
