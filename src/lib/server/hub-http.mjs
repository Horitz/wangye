import { AdminError } from "./admin-core.mjs";
import { openSiteAdminStore } from "./site-store.mjs";
import { readJson, readSessionCookie, verifyOrigin } from "./admin-http.mjs";

const HUB_ID = "dashboard";
const ENTRY_IDS = ["essentials", "guides", "community"];
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const reject = () => { throw new AdminError("invalid_request"); };
function localized(value, max, required = false) {
  if (!record(value)) reject();
  for (const language of ["zh", "ru"]) {
    if (typeof value[language] !== "string" || value[language].length > max || value[language].includes("\0") || (required && !value[language].trim())) reject();
  }
  return { zh: value.zh, ru: value.ru };
}

/** Only published copy is stored. Entry identities and navigation remain application-owned. */
export function validateHubContent(value) {
  if (!record(value) || value.version !== 1 || value.id !== HUB_ID || !Array.isArray(value.entries) || value.entries.length !== ENTRY_IDS.length) reject();
  return {
    version: 1,
    id: HUB_ID,
    eyebrow: localized(value.eyebrow, 120),
    title: localized(value.title, 160, true),
    highlight: localized(value.highlight, 160),
    description: localized(value.description, 1000),
    entries: value.entries.map((entry, index) => {
      if (!record(entry) || entry.id !== ENTRY_IDS[index]) reject();
      return {
        id: ENTRY_IDS[index],
        title: localized(entry.title, 160, true),
        description: localized(entry.description, 1000),
        action: localized(entry.action, 80, true),
      };
    }),
  };
}

const response = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } });

export async function handleHubRequest(request, { dataDir, now, env = process.env } = {}) {
  let store;
  try {
    if (!["GET", "PUT"].includes(request.method)) return response({ error: "invalid_request" }, 405, { Allow: "GET, PUT" });
    verifyOrigin(request, env, request.method === "PUT");
    store = await openSiteAdminStore({ dataDir, now, env });
    if (request.method === "GET") return response({ document: await store.readEditorial(HUB_ID) });
    const token = readSessionCookie(request);
    if (!await store.session(token)) throw new AdminError("unauthorized", 401);
    const document = validateHubContent(await readJson(request, 32768));
    return response({ document: await store.writeEditorial(token, document) });
  } catch (error) {
    return response({ error: error instanceof AdminError ? error.code : "unavailable" }, error instanceof AdminError ? error.status : 503);
  } finally { store?.close(); }
}
