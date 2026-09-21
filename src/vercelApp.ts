import type { Express } from "express";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { attachApolloHttp } from "./apolloHttp.js";

let appReady: Promise<Express> | null = null;

/** Cached Express app for Vercel serverless (cold-start safe). */
export function getVercelApp(): Promise<Express> {
  appReady ??= (async () => {
    await connectDatabase();
    const app = createApp();
    await attachApolloHttp(app);
    return app;
  })();
  return appReady;
}
