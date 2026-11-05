import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getVercelApp } from "../src/vercelApp.js";
import { isAllowedCorsOrigin } from "../src/config/corsOrigins.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || "";

  // Always respond to preflight OPTIONS requests immediately with CORS headers
  if (req.method === "OPTIONS") {
    if (origin && isAllowedCorsOrigin(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      (req.headers["access-control-request-headers"] as string) ||
        "Content-Type, Authorization, X-Requested-With, Accept, Apollo-Require-Preflight",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  try {
    const app = await getVercelApp();
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel handler top-level error:", err);
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: err?.message || String(err),
    });
  }
}
