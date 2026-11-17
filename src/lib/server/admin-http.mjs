import { AdminError, SESSION_COOKIE, SESSION_SECONDS } from "./admin-core.mjs";
import { openSiteAdminStore } from "./site-store.mjs";

const loopback = url => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
const cleanOrigin = value => {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url;
  } catch { return null; }
};

/** Origins are pinned to configuration or a loopback URL, never inferred from forwarded headers. */
export function verifyOrigin(request, env = process.env, mutating = false) {
  const url = new URL(request.url);
  const configured = env.STUDENTPATH_ORIGIN ? cleanOrigin(env.STUDENTPATH_ORIGIN) : null;
  const vercelOrigins = env.VERCEL === "1" ? [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(value => typeof value === "string" && /^[a-z0-9.-]+\.vercel\.app$/i.test(value))
    .map(value => cleanOrigin(`https://${value}`)) : [];
  if (env.STUDENTPATH_ORIGIN && (!configured || (!loopback(configured) && configured.protocol !== "https:"))) throw new AdminError("unavailable", 503);
  if (!["http:", "https:"].includes(url.protocol)) throw new AdminError("forbidden", 403);
  const host = request.headers.get("host");
  const publicUrl = host ? cleanOrigin(`${url.protocol}//${host}`) : url;
  if (!publicUrl || (host && publicUrl.host.toLowerCase() !== host.toLowerCase())) throw new AdminError("forbidden", 403);
  // Next may reconstruct an internal localhost URL while the browser uses 127.0.0.1.
  // Only these fixed loopback aliases may differ; the browser Origin still matches Host exactly.
  const deployment = [configured, ...vercelOrigins].find(candidate => candidate?.host === publicUrl.host);
  if (!deployment && (configured || env.VERCEL === "1" || !loopback(url) || !loopback(publicUrl) || publicUrl.port !== url.port)) throw new AdminError("forbidden", 403);
  const expectedOrigin = deployment?.origin ?? publicUrl.origin;
  const rawOrigin = request.headers.get("origin");
  const origin = rawOrigin ? cleanOrigin(rawOrigin) : null;
  if ((mutating && !origin) || (rawOrigin && (!origin || origin.origin !== expectedOrigin)) || request.headers.get("sec-fetch-site") === "cross-site") throw new AdminError("forbidden", 403);
  return { secure: expectedOrigin.startsWith("https:") };
}
export function readSessionCookie(request) {
  const found = (request.headers.get("cookie") ?? "").split(";").map(part => part.trim()).filter(part => part.startsWith(`${SESSION_COOKIE}=`));
  if (found.length !== 1) return null;
  const token = found[0].slice(SESSION_COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function sessionCookie(token, secure, clear = false) {
  return `${SESSION_COOKIE}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}
export async function readJson(request, limit, sizeError = "invalid_request") {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) throw new AdminError("invalid_request");
  const declared = request.headers.get("content-length");
  if (declared !== null && !/^\d+$/.test(declared)) throw new AdminError("invalid_request");
  if (declared !== null && Number(declared) > limit) throw new AdminError(sizeError, sizeError === "content_size" ? 413 : 400);
  if (!request.body) throw new AdminError("invalid_request");
  const reader = request.body.getReader();
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { void reader.cancel(); reject(new AdminError("invalid_request")); }, 10000); });
  try {
    const chunks = []; let total = 0;
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new AdminError(sizeError, sizeError === "content_size" ? 413 : 400); }
      chunks.push(value);
    }
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new AdminError("invalid_request");
    return value;
  } catch (error) { if (error instanceof AdminError) throw error; throw new AdminError("invalid_request"); }
  finally { clearTimeout(timer); reader.releaseLock(); }
}
const response = (data, status = 200, extra = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
const shape = (value, keys) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

/** The same boundary is called by Next routes and request-level security tests. */
export async function handleAdminRequest(request, action, { dataDir, now, env = process.env, seedPosts = [], seedFeaturedIds = [] } = {}) {
  let store;
  try {
    const expectedMethod = action === "session" || action === "featured-read" ? "GET" : action === "featured-write" ? "PUT" : "POST";
    if (request.method !== expectedMethod) return response({ error: "invalid_request" }, 405, { Allow: expectedMethod });
    const policy = verifyOrigin(request, env, expectedMethod !== "GET");
    store = await openSiteAdminStore({ dataDir, now, env });
    const token = readSessionCookie(request);
    if (action === "session") {
      const user = await store.session(token);
      return response({ authenticated: Boolean(user), ...(user ? { username: user.username } : {}), configured: await store.configured() });
    }
    if (action === "login") {
      const input = await readJson(request, 2048);
      if (!shape(input, ["username", "password"]) || typeof input.username !== "string" || typeof input.password !== "string") throw new AdminError("invalid_request");
      const user = await store.login(input.username, input.password);
      if (token) await store.logout(token);
      return response({ authenticated: true, username: user.username, configured: true }, 200, { "Set-Cookie": sessionCookie(user.token, policy.secure) });
    }
    if (action === "logout") {
      const input = await readJson(request, 1024);
      if (!shape(input, [])) throw new AdminError("invalid_request");
      await store.logout(token);
      return response({ authenticated: false, configured: await store.configured() }, 200, { "Set-Cookie": sessionCookie("", policy.secure, true) });
    }
    if (action === "featured-read" || action === "featured-write") {
      if (action === "featured-write" && !await store.session(token)) throw new AdminError("unauthorized", 401);
      await store.seed(seedPosts, seedFeaturedIds);
      if (action === "featured-read") return response(await store.catalog());
      const input = await readJson(request, 32768);
      return response(await store.setFeatured(token, input));
    }
    throw new AdminError("invalid_request");
  } catch (error) {
    const known = error instanceof AdminError;
    const status = known ? error.status : 503;
    const code = known ? error.code : "unavailable";
    return response({ error: code }, status, status === 429 ? { "Retry-After": "900" } : {});
  } finally { try { store?.close(); } catch { /* Never expose database details through an error response. */ } }
}
