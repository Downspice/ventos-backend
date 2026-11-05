import type { Express, Request, Response, NextFunction } from "express";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { attachApolloHttp } from "./apolloHttp.js";
import { isAllowedCorsOrigin } from "./config/corsOrigins.js";

let appInstance: Express | null = null;
let apolloReadyPromise: Promise<void> | null = null;

/** Cached Express app for Vercel serverless (cold-start safe). */
export async function getVercelApp(): Promise<Express> {
  if (!appInstance) {
    const app = createApp();

    // Middleware to ensure DB connection for data routes,
    // skipping DB connection for /health and preflight OPTIONS.
    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (req.path === "/health" || req.method === "OPTIONS") {
        return next();
      }
      try {
        await connectDatabase();
        next();
      } catch (err: any) {
        console.error("Database connection error in Vercel request:", err);
        const origin = req.headers.origin;
        if (origin && isAllowedCorsOrigin(origin)) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Access-Control-Allow-Credentials", "true");
        }
        return res.status(503).json({
          error: "Database connection failed",
          message: err?.message || String(err),
        });
      }
    });

    apolloReadyPromise = attachApolloHttp(app);
    appInstance = app;
  }

  await apolloReadyPromise;
  return appInstance;
}
