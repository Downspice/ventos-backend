import mongoose from "mongoose";
import { env } from "./env.js";

declare global {
  // eslint-disable-next-line no-var
  var __ventosMongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const cache = global.__ventosMongoose ?? { conn: null, promise: null };
global.__ventosMongoose = cache;

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 10_000,
  });
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
