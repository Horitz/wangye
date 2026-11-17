import { AdminError } from "./admin-core.mjs";
import { openSiteAdminStore } from "./site-store.mjs";
import { readJson, readSessionCookie, verifyOrigin } from "./admin-http.mjs";

const response = (data, status = 200, extra = {}) => Response.json(data, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
});

export async function handleLifeTipsRequest(request, defaults, { dataDir, now, env = process.env } = {}) {
  let store;
  try {
    if (!["GET", "PUT"].includes(request.method)) return response({ error: "invalid_request" }, 405, { Allow: "GET, PUT" });
    verifyOrigin(request, env, request.method === "PUT");
    store = await openSiteAdminStore({ dataDir, now, env });
    if (request.method === "GET") return response({ tips: await store.readLifeTips(defaults) });
    const token = readSessionCookie(request);
    if (!await store.session(token)) throw new AdminError("unauthorized", 401);
    const input = await readJson(request, 1024 * 1024, "content_size");
    if (Object.keys(input).length !== 1 || !Object.hasOwn(input, "tips")) throw new AdminError("invalid_request");
    return response({ tips: await store.writeLifeTips(token, input.tips, defaults) });
  } catch (error) {
    return response({ error: error instanceof AdminError ? error.code : "unavailable" }, error instanceof AdminError ? error.status : 503);
  } finally { store?.close(); }
}
