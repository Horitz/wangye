import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { AdminError } from "./admin-core.mjs";
import { openSiteAdminStore } from "./site-store.mjs";
import { isCloudDatabase } from "./site-runtime.mjs";
import { communityImageUrl, uploadCommunityImage } from "./supabase-media.mjs";
import { isCommunityUploadPath } from "../site-media-paths.mjs";
import { CommunityPostEditError } from "./community-post-schema.mjs";
import { readJson, readSessionCookie, verifyOrigin } from "./admin-http.mjs";
import { EDITORIAL_BODY_LIMIT } from "../guide-media-limits.mjs";

const response = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } });
const failure = error => {
  const known = error instanceof AdminError || error instanceof CommunityPostEditError;
  return response({ error: known ? error.code : "unavailable" }, known ? error.status : 503);
};
const mediaDirectory = dataDir => join(resolve(/* turbopackIgnore: true */ dataDir ?? process.env.STUDENTPATH_DATA_DIR ?? resolve(process.cwd(), ".data")), "community-media");

export async function handleCommunityPostEdit(request, id, { dataDir, now, env = process.env, seedPosts = [], seedFeaturedIds = [] } = {}) {
  let store;
  try {
    if (request.method !== "PUT") return response({ error: "invalid_request" }, 405, { Allow: "PUT" });
    verifyOrigin(request, env, true);
    store = await openSiteAdminStore({ dataDir, now, env });
    const token = readSessionCookie(request);
    if (!await store.session(token)) throw new AdminError("unauthorized", 401);
    const input = await readJson(request, EDITORIAL_BODY_LIMIT, "content_size");
    await store.seed(seedPosts, seedFeaturedIds);
    const persistImages = isCloudDatabase(env) ? async uploads => {
      for (const upload of uploads) await uploadCommunityImage(upload.filename, upload.bytes, { env });
    } : uploads => {
      const directory = mediaDirectory(dataDir);
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      for (const upload of uploads) {
        // Names are assigned by the server and exclusive writes never overwrite an existing photo.
        writeFileSync(join(directory, upload.filename), upload.bytes, { flag: "wx", mode: 0o600 });
      }
    };
    const snapshot = await store.editPublishedPost(token, id, input, persistImages);
    return response(snapshot);
  } catch (error) { return failure(error); }
  finally { await store?.close(); }
}

/** Runtime uploads are served here rather than relying on Next's build-time public file index. */
export async function handleCommunityMedia(request, filename, { dataDir, now, env = process.env } = {}) {
  let store;
  try {
    if (request.method !== "GET" && request.method !== "HEAD") return response({ error: "invalid_request" }, 405, { Allow: "GET, HEAD" });
    verifyOrigin(request, env);
    const src = `/media/community/uploads/${filename}`;
    if (!isCommunityUploadPath(src)) return response({ error: "not_found" }, 404);
    store = await openSiteAdminStore({ dataDir, now, env });
    if (!await store.hasPublishedCommunityImage(src)) return response({ error: "not_found" }, 404);
    if (isCloudDatabase(env)) return new Response(null, { status: 307, headers: {
      Location: communityImageUrl(filename, { env }), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    } });
    let bytes;
    try { bytes = readFileSync(join(mediaDirectory(dataDir), filename)); }
    catch (error) { if (error?.code === "ENOENT") return response({ error: "not_found" }, 404); throw error; }
    return new Response(request.method === "HEAD" ? null : bytes, { headers: {
      "Content-Type": "image/jpeg", "Content-Length": String(bytes.length),
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return failure(error); }
  finally { await store?.close(); }
}
