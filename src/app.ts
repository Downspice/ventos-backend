import express from "express";
import cors from "cors";
import passport from "passport";
import { isAllowedCorsOrigin } from "./config/corsOrigins.js";
import { configurePassport } from "./auth/passport.js";
import { authRouter } from "./routes/auth.routes.js";
import { authRateLimiter, graphqlRateLimiter } from "./middleware/rateLimit.js";
import { getLocalUploadsRoot } from "./services/storage.service.js";

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (isAllowedCorsOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Apollo-Require-Preflight",
  ],
  maxAge: 86400,
};

export function createApp() {
  const app = express();
  app.set("trust proxy", true);

  // Enable CORS middleware for all routes (including OPTIONS preflights)
  app.use(cors(corsOptions));

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

  // Global error handler preserving CORS headers
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled express error:", err);
    const origin = req.headers.origin;
    if (origin && isAllowedCorsOrigin(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    const status = typeof err.status === "number" ? err.status : 500;
    res.status(status).json({
      error: "Internal Server Error",
      message: err.message || "An unexpected error occurred",
    });
  });

  return app;
}
