import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),
  isProduction: optional("NODE_ENV", "development") === "production",

  mongodbUri: optional("MONGODB_URI", "mongodb://127.0.0.1:27017/ventos"),

  jwtSecret: optional("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),

  oauth: {
    google: {
      clientId: optional("OAUTH_GOOGLE_CLIENT_ID"),
      clientSecret: optional("OAUTH_GOOGLE_CLIENT_SECRET"),
      callbackUrl: optional(
        "OAUTH_GOOGLE_CALLBACK_URL",
        "http://127.0.0.1:4000/auth/google/callback",
      ),
    },
  },

  supabase: {
    url: optional("SUPABASE_URL"),
    serviceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
    storageBucket: optional("SUPABASE_STORAGE_BUCKET", "ventos"),
  },

  /** Base URL for upload links (set to deployed API origin on Vercel). */
  publicApiUrl:
    optional("PUBLIC_API_URL") ||
    (optional("VERCEL_URL") ? `https://${optional("VERCEL_URL")}` : ""),

  resend: {
    apiKey: optional("RESEND_API_KEY"),
    from: optional("EMAIL_FROM", "Ventos <onboarding@resend.dev>"),
  },

  clients: {
    webUrl: optional("CLIENT_WEB_URL", "http://127.0.0.1:5173"),
    adminUrl: optional("CLIENT_ADMIN_URL", "http://127.0.0.1:5174"),
  },

  /** Comma-separated extra browser origins for CORS (e.g. Vercel preview URLs). */
  corsExtraOrigins: optional("CORS_EXTRA_ORIGINS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  /** Allow any https://*.vercel.app origin (typical for Preview / test frontends). */
  corsAllowVercelApp:
    optional("CORS_ALLOW_VERCEL", process.env.VERCEL ? "true" : "false") === "true",

  vercelEnv: optional("VERCEL_ENV"),
  vercelUrl: optional("VERCEL_URL"),
} as const;

export function assertProductionSecrets(): void {
  const onVercelProduction =
    env.vercelEnv === "production" || (env.isProduction && Boolean(process.env.VERCEL));
  if (!onVercelProduction) return;
  required("JWT_SECRET");
  required("MONGODB_URI");
}
