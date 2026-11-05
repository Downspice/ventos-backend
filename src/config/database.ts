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
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.mongodbUri, {
        serverSelectionTimeoutMS: 8_000,
      })
      .then((m) => {
        cache.conn = m;
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        cache.conn = null;
        throw err;
      });
  }

  return cache.promise;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  cache.promise = null;
  cache.conn = null;
}
