import { createHash } from "node:crypto";
import { AdminError } from "./admin-core.mjs";
import { readJson, readSessionCookie, verifyOrigin } from "./admin-http.mjs";
import { CommunityPostEditError, jpegBytes } from "./community-post-schema.mjs";
import { openSiteAdminStore } from "./site-store.mjs";
import { isCloudDatabase } from "./site-runtime.mjs";
import { editorialImageUrl, uploadSiteMedia } from "./supabase-media.mjs";
import { isEditorialMediaPath } from "../site-media-paths.mjs";

const response = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } });
const failure = error => {
  const known = error instanceof AdminError || error instanceof CommunityPostEditError;
  return response({ error: known ? error.code : "unavailable" }, known ? error.status : 503);
};

/** Each request contains one compressed image, keeping saves below the serverless body limit. */
export async function handleSiteMedia(request, { dataDir, now, env = process.env } = {}) {
  let store;
  try {
    if (!["GET", "POST"].includes(request.method)) return response({ error: "invalid_request" }, 405, { Allow: "GET, POST" });
    verifyOrigin(request, env, request.method === "POST");
    const enabled = isCloudDatabase(env);
    if (request.method === "GET") return response({ enabled });
    if (!enabled) return response({ error: "unavailable" }, 503);
    store = await openSiteAdminStore({ dataDir, now, env });
    if (!await store.session(readSessionCookie(request))) throw new AdminError("unauthorized", 401);
    const input = await readJson(request, 1_300_000, "content_size");
    const image = input.image;
    if (!["editorial", "community"].includes(input.kind) || !image || typeof image !== "object"
      || typeof image.src !== "string" || !Number.isInteger(image.width) || !Number.isInteger(image.height)) throw new AdminError("invalid_request");
    const bytes = jpegBytes(image);
    const filename = `${createHash("sha256").update(bytes).digest("hex")}.jpg`;
    await uploadSiteMedia(`${input.kind}/${filename}`, bytes, { env });
    return response({ src: input.kind === "editorial" ? `/media/editorial/${filename}` : `/media/community/uploads/${filename}` });
  } catch (error) { return failure(error); }
  finally { await store?.close(); }
}

/** Immutable published pictures use Storage's public delivery URL; no credentials reach the browser. */
export function handleEditorialMedia(request, filename, { env = process.env } = {}) {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") return response({ error: "invalid_request" }, 405, { Allow: "GET, HEAD" });
    verifyOrigin(request, env);
    if (!isEditorialMediaPath(`/media/editorial/${filename}`) || !isCloudDatabase(env)) return response({ error: "not_found" }, 404);
    return new Response(null, { status: 307, headers: {
      Location: editorialImageUrl(filename, { env }), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return failure(error); }
}
