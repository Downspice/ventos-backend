import { env } from "./env.js";

function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    return url.origin;
  } catch {
    return origin.replace(/\/+$/, "");
  }
}

/** Mirror localhost ↔ 127.0.0.1 so dev works regardless of which URL you open in the browser. */
function expandLocalhostAliases(origin: string): string[] {
  try {
    const url = new URL(origin);
    const port = url.port ? `:${url.port}` : "";
    if (url.hostname === "127.0.0.1") {
      return [url.origin, `${url.protocol}//localhost${port}`];
    }
    if (url.hostname === "localhost") {
      return [url.origin, `${url.protocol}//127.0.0.1${port}`];
    }
    return [url.origin];
  } catch {
    return [origin.replace(/\/+$/, "")];
  }
}

export function allowedCorsOrigins(): string[] {
  const set = new Set<string>();
  for (const origin of [env.clients.webUrl, env.clients.adminUrl]) {
    if (!origin) continue;
    for (const expanded of expandLocalhostAliases(origin)) {
      set.add(normalizeOrigin(expanded));
    }
  }
  return [...set];
}

function isVercelAppOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      (url.hostname.endsWith(".vercel.app") || url.hostname === "vercel.app")
    );
  } catch {
    return false;
  }
}

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);

  // Allow explicit CORS_ALLOW_ALL
  if (process.env.CORS_ALLOW_ALL === "true" || process.env.CORS_ALLOW_ALL === "*") {
    return true;
  }

  // Always allow localhost and 127.0.0.1
  try {
    const url = new URL(normalized);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "0.0.0.0") {
      return true;
    }
  } catch {
    /* ignore */
  }

  // Always allow any Vercel deployment origin (e.g. *.vercel.app)
  if (isVercelAppOrigin(normalized)) {
    return true;
  }

  if (allowedCorsOrigins().includes(normalized)) return true;
  if (env.corsExtraOrigins.map(normalizeOrigin).includes(normalized)) return true;
  if (env.corsAllowVercelApp && isVercelAppOrigin(normalized)) return true;
  return false;
}
