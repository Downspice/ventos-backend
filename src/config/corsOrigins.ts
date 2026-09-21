import { env } from "./env.js";

/** Mirror localhost ↔ 127.0.0.1 so dev works regardless of which URL you open in the browser. */
function expandLocalhostAliases(origin: string): string[] {
  try {
    const url = new URL(origin);
    const port = url.port ? `:${url.port}` : "";
    if (url.hostname === "127.0.0.1") {
      return [origin, `${url.protocol}//localhost${port}`];
    }
    if (url.hostname === "localhost") {
      return [origin, `${url.protocol}//127.0.0.1${port}`];
    }
  } catch {
    /* ignore invalid URLs */
  }
  return [origin];
}

export function allowedCorsOrigins(): string[] {
  const set = new Set<string>();
  for (const origin of [env.clients.webUrl, env.clients.adminUrl]) {
    if (!origin) continue;
    for (const expanded of expandLocalhostAliases(origin)) {
      set.add(expanded);
    }
  }
  return [...set];
}

function isVercelAppOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedCorsOrigins().includes(origin)) return true;
  if (env.corsExtraOrigins.includes(origin)) return true;
  if (env.corsAllowVercelApp && isVercelAppOrigin(origin)) return true;
  return false;
}
