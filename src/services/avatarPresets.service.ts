import { badRequest } from "../errors/appError.js";

/** Stored on User.avatarUrl / Employee.avatarUrl — served from app `public/avatars`. */
export const AVATAR_PRESET_IDS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESET_IDS)[number];

const PRESET_PATHS = new Set(
  AVATAR_PRESET_IDS.flatMap((id) => [
    `/avatars/${id}.png`,
    ...(id === "11" ? ["/avatars/11.jpg"] : []),
  ]),
);

export function avatarPresetPath(id: AvatarPresetId): string {
  return id === "11" ? "/avatars/11.jpg" : `/avatars/${id}.png`;
}

/** Stable preset from email/id so the same person always gets the same default avatar. */
export function pickDefaultAvatarPresetId(seed: string): AvatarPresetId {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const index = hash % AVATAR_PRESET_IDS.length;
  return AVATAR_PRESET_IDS[index]!;
}

export function defaultAvatarUrlForSeed(seed: string): string {
  return avatarPresetPath(pickDefaultAvatarPresetId(seed));
}

export function parseAvatarPresetIdFromUrl(url: string | undefined | null): AvatarPresetId | null {
  if (!url?.trim()) return null;
  const v = url.trim();
  const m = v.match(/^\/avatars\/(\d{2})\.(png|jpg)$/);
  if (!m) return null;
  const id = m[1] as AvatarPresetId;
  return AVATAR_PRESET_IDS.includes(id) ? id : null;
}

/** Accept preset paths or https URLs (e.g. OAuth profile photos). */
export function normalizeAvatarUrl(value: string | undefined | null): string | undefined {
  if (value == null || value.trim() === "") return undefined;
  const v = value.trim();
  if (PRESET_PATHS.has(v)) return v;
  if (v.startsWith("https://") && v.length <= 2048) return v;
  badRequest("Invalid avatar. Choose a preset or use an HTTPS profile photo URL.");
}
