import express from "express";
import cors from "cors";
import passport from "passport";
import { isAllowedCorsOrigin } from "./config/corsOrigins.js";
import { configurePassport } from "./auth/passport.js";
import { authRouter } from "./routes/auth.routes.js";
import { authRateLimiter, graphqlRateLimiter } from "./middleware/rateLimit.js";
import { getLocalUploadsRoot } from "./services/storage.service.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", true);

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  configurePassport();
  app.use(passport.initialize());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Local disk uploads are not available on Vercel serverless — use Supabase in cloud envs.
  if (!process.env.VERCEL) {
    app.use("/uploads", express.static(getLocalUploadsRoot()));
  }

  app.use("/auth", authRateLimiter, authRouter);

  app.use("/graphql", graphqlRateLimiter);

  return app;
}
