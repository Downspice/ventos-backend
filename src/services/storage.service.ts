import fs from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

let client: SupabaseClient | null = null;
let loggedLocalFallback = false;

export function getLocalUploadsRoot(): string {
  return path.join(process.cwd(), "uploads");
}

function getClient(): SupabaseClient | null {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    return null;
  }
  client ??= createClient(env.supabase.url, env.supabase.serviceRoleKey);
  return client;
}

function assertSafeRelativePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (path.isAbsolute(normalized) || normalized.startsWith("..")) {
    throw new Error("Invalid storage path");
  }
  return normalized;
}

function localPublicUrl(relativePath: string): string {
  const base = env.publicApiUrl || `http://127.0.0.1:${env.port}`;
  const urlPath = relativePath.split(path.sep).join("/");
  return `${base.replace(/\/$/, "")}/uploads/${urlPath}`;
}

async function uploadLocalDevFile(
  relativePath: string,
  body: Buffer | Uint8Array,
): Promise<{ publicUrl: string }> {
  if (!loggedLocalFallback) {
    loggedLocalFallback = true;
    console.info(
      "[storage] Supabase not configured; storing files in backend/uploads/ (development only)",
    );
  }
  const safe = assertSafeRelativePath(relativePath);
  const full = path.join(getLocalUploadsRoot(), safe);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
  return { publicUrl: localPublicUrl(safe) };
}

async function deleteLocalDevFile(relativePath: string): Promise<void> {
  const safe = assertSafeRelativePath(relativePath);
  const full = path.join(getLocalUploadsRoot(), safe);
  await fs.unlink(full).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== "ENOENT") throw err;
  });
}

export async function uploadPublicFile(
  storagePath: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ publicUrl: string } | null> {
  const supabase = getClient();
  if (!supabase) {
    if (!env.isProduction) {
      return uploadLocalDevFile(storagePath, body);
    }
    console.warn("[storage] Supabase not configured; upload skipped");
    return null;
  }

  const { error } = await supabase.storage
    .from(env.supabase.storageBucket)
    .upload(storagePath, body, { contentType, upsert: true });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(env.supabase.storageBucket).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl };
}

export async function deletePublicFile(storagePath: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) {
    if (!env.isProduction) {
      await deleteLocalDevFile(storagePath);
    }
    return;
  }
  const { error } = await supabase.storage.from(env.supabase.storageBucket).remove([storagePath]);
  if (error) {
    throw error;
  }
}
