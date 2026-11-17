import { createHash } from "node:crypto";
import { isCommunityUploadPath, isEditorialMediaPath } from "../site-media-paths.mjs";

export class SiteMediaError extends Error {
  constructor() { super("unavailable"); }
}

function storageConfig(env) {
  let url;
  try { url = new URL(env.SUPABASE_URL); } catch { throw new SiteMediaError(); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new SiteMediaError();
  const bucket = env.STUDENTPATH_MEDIA_BUCKET || "studentpath-media";
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(bucket)) throw new SiteMediaError();
  return { origin: url.origin, bucket };
}

function objectPath(path) {
  if (typeof path !== "string" || !/^(?:editorial|community)\/[a-f0-9-]+\.jpg$/.test(path)) throw new SiteMediaError();
  return path.split("/").map(encodeURIComponent).join("/");
}

/** Only public site media belongs in this bucket; browser-only images are never sent here. */
export function siteMediaUrl(path, { env = process.env } = {}) {
  const { origin, bucket } = storageConfig(env);
  return `${origin}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath(path)}`;
}

/** Immutable upload: an existing hash can be reused, never overwritten. */
export async function uploadSiteMedia(path, bytes, { env = process.env, contentType = "image/jpeg" } = {}) {
  const { origin, bucket } = storageConfig(env);
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || (!key.startsWith("sb_secret_") && key.split(".").length !== 3) || contentType !== "image/jpeg") throw new SiteMediaError();
  const headers = {
    apikey: key,
    "Content-Type": contentType,
    "Cache-Control": "max-age=31536000",
    "x-upsert": "false",
  };
  // Opaque secret keys go only in apikey; legacy service-role keys are JWTs.
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  let result;
  try {
    result = await fetch(`${origin}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath(path)}`, {
      method: "POST", headers, body: bytes, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30000),
    });
  } catch { throw new SiteMediaError(); }
  if (!result.ok) {
    const error = await result.json().catch(() => ({}));
    const digest = createHash("sha256").update(bytes).digest("hex");
    const sameHashPath = path === `editorial/${digest}.jpg` || path === `community/${digest}.jpg`;
    const duplicate = result.status === 409 || error.code === "KeyAlreadyExists" || error.error === "Duplicate";
    if (!sameHashPath || !duplicate) throw new SiteMediaError();
  } else {
    await result.body?.cancel();
  }
  return siteMediaUrl(path, { env });
}

export async function uploadCommunityImage(filename, bytes, { env = process.env } = {}) {
  if (!isCommunityUploadPath(`/media/community/uploads/${filename}`)) throw new SiteMediaError();
  return uploadSiteMedia(`community/${filename}`, bytes, { env });
}

export function communityImageUrl(filename, { env = process.env } = {}) {
  if (!isCommunityUploadPath(`/media/community/uploads/${filename}`)) throw new SiteMediaError();
  return siteMediaUrl(`community/${filename}`, { env });
}

export function editorialImageUrl(filename, { env = process.env } = {}) {
  if (!isEditorialMediaPath(`/media/editorial/${filename}`)) throw new SiteMediaError();
  return siteMediaUrl(`editorial/${filename}`, { env });
}
