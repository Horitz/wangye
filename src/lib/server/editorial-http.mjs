import { AdminError } from "./admin-core.mjs";
import { openSiteAdminStore } from "./site-store.mjs";
import { isEditorialMediaPath } from "../site-media-paths.mjs";
import { readJson, readSessionCookie, verifyOrigin } from "./admin-http.mjs";
import { randomUUID } from "node:crypto";
import { GUIDE_MEDIA_LIMIT, GUIDE_MEDIA_EDGE_LIMIT, GUIDE_MEDIA_ENCODED_LIMIT, GUIDE_MEDIA_CAPTION_LIMIT, EDITORIAL_BODY_LIMIT } from "../guide-media-limits.mjs";
import { parseContentTags } from "../content-tags.mjs";

export const GUIDE_SECTION_IDS = ["visa-extension", "residence-registration", "medical-examination", "bank-card", "university-admission", "first-week", "public-transport", "housing"];
const dynamicId = value => typeof value === "string" && /^guide-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const dynamicDocument = value => record(value) && dynamicId(value.id) && GUIDE_SECTION_IDS.includes(value.sectionId);
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const reject = () => { throw new AdminError("invalid_request"); };
function tags(value) { try { return parseContentTags(value); } catch { reject(); } }
const text = (value, max, required = false) => {
  if (typeof value !== "string" || value.length > max || value.includes("\0") || (required && !value.trim())) reject();
  return value;
};
const localized = (value, max, required = false) => {
  if (!record(value)) reject();
  return { zh: text(value.zh, max, required), ru: text(value.ru, max, required) };
};
const list = (value, max, parse) => {
  if (!Array.isArray(value) || value.length > max) reject();
  return value.map(parse);
};
function sources(value) {
  return list(value, 12, source => {
    if (!record(source)) reject();
    const address = text(source.url, 2048, true);
    let url;
    try { url = new URL(address); } catch { reject(); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) reject();
    return { label: localized(source.label, 300), url: address };
  });
}
function images(value) {
  const ids = new Set();
  return list(value, GUIDE_MEDIA_LIMIT, image => {
    if (!record(image) || typeof image.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(image.id) || ids.has(image.id)) reject();
    ids.add(image.id);
    const src = text(image.src, GUIDE_MEDIA_ENCODED_LIMIT, true);
    if (!isEditorialMediaPath(src)) {
      if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(src)) reject();
      const data = src.slice(23);
      if (data.length % 4 !== 0) reject();
      const bytes = Buffer.from(data, "base64");
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) reject();
    }
    if (![image.width, image.height].every(size => Number.isInteger(size) && size > 0 && size <= GUIDE_MEDIA_EDGE_LIMIT)) reject();
    return { id: image.id, src, width: image.width, height: image.height, caption: text(image.caption, GUIDE_MEDIA_CAPTION_LIMIT) };
  });
}

/** Built-in task identities remain fixed; new guides keep the stable IDs supplied by their editor. */
export function validateEditorialDocument(value, defaults, { creating = false } = {}) {
  const dynamic = creating || dynamicDocument(defaults);
  if (!record(value) || value.version !== 1 || !record(value.author) || !Array.isArray(value.steps)) reject();
  if (dynamic) {
    if (value.id !== (creating ? "new-guide" : defaults.id) || !GUIDE_SECTION_IDS.includes(value.sectionId)
      || (!creating && value.sectionId !== defaults.sectionId) || value.steps.length < 1 || value.steps.length > 20) reject();
  } else if (!defaults || value.id !== defaults.id || value.sectionId !== undefined || value.steps.length !== defaults.steps.length) reject();
  const stepIds = new Set();
  const steps = value.steps.map((step, index) => {
    if (!record(step)) reject();
    const original = dynamic ? step : defaults.steps[index];
    if (dynamic) {
      if (typeof step.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(step.id) || stepIds.has(step.id) || step.legacyIndex !== 0) reject();
      stepIds.add(step.id);
    } else if (step.id !== original.id || step.legacyIndex !== original.legacyIndex) reject();
    return {
      id: original.id, legacyIndex: original.legacyIndex,
      title: localized(step.title, 160, true), description: localized(step.description, 8000),
      materials: list(step.materials, 30, item => localized(item, 1000)),
      ...(step.place === undefined ? {} : { place: localized(step.place, 300) }),
      ...(step.address === undefined ? {} : { address: localized(step.address, 1000) }),
      ...(step.requirements === undefined ? {} : { requirements: localized(step.requirements, 4000) }),
      images: images(step.images), sources: sources(step.sources),
    };
  });
  return {
    version: 1, id: value.id,
    ...(dynamic ? { sectionId: value.sectionId } : {}),
    ...(Object.hasOwn(value, "tags") ? { tags: tags(value.tags) } : {}),
    title: localized(value.title, 160, true), summary: localized(value.summary, 4000),
    author: { name: localized(value.author.name, 120), role: localized(value.author.role, 160) },
    images: images(value.images), steps, sources: sources(value.sources),
  };
}

const response = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } });
const failure = error => response({ error: error instanceof AdminError ? error.code : "unavailable" }, error instanceof AdminError ? error.status : 503);

export async function handleEditorialRequest(request, id, defaults, { dataDir, now, env = process.env } = {}) {
  let store;
  try {
    if (!["GET", "PUT"].includes(request.method)) return response({ error: "invalid_request" }, 405, { Allow: "GET, PUT" });
    verifyOrigin(request, env, request.method === "PUT");
    store = await openSiteAdminStore({ dataDir, now, env });
    const saved = await store.readEditorial(id);
    const canonical = defaults?.id === id ? defaults : dynamicDocument(saved) && saved.id === id ? saved : null;
    if (!canonical) return response({ error: "not_found" }, 404);
    if (request.method === "GET") return response({ document: saved });
    const token = readSessionCookie(request);
    if (!await store.session(token)) throw new AdminError("unauthorized", 401);
    const document = validateEditorialDocument(await readJson(request, EDITORIAL_BODY_LIMIT), canonical);
    // Older editors omit this additive field; only an explicit [] clears saved tags.
    if (!Object.hasOwn(document, "tags") && saved && Object.hasOwn(saved, "tags")) document.tags = tags(saved.tags);
    return response({ document: await store.writeEditorial(token, document) });
  } catch (error) { return failure(error); }
  finally { store?.close(); }
}

export async function handleEditorialCreate(request, { dataDir, now, env = process.env } = {}) {
  let store;
  try {
    if (request.method !== "POST") return response({ error: "invalid_request" }, 405, { Allow: "POST" });
    verifyOrigin(request, env, true);
    store = await openSiteAdminStore({ dataDir, now, env });
    const token = readSessionCookie(request);
    if (!await store.session(token)) throw new AdminError("unauthorized", 401);
    const validated = validateEditorialDocument(await readJson(request, EDITORIAL_BODY_LIMIT), null, { creating: true });
    const document = await store.createEditorial(token, { ...validated, id: `guide-${randomUUID()}` });
    return response({ document }, 201, { Location: `/api/content/${document.id}` });
  } catch (error) { return failure(error); }
  finally { store?.close(); }
}

export async function handleEditorialCatalog(request, { dataDir, now, env = process.env } = {}) {
  let store;
  try {
    if (request.method !== "GET") return response({ error: "invalid_request" }, 405, { Allow: "GET" });
    verifyOrigin(request, env);
    store = await openSiteAdminStore({ dataDir, now, env });
    return response({ summaries: await store.editorialCatalog() });
  } catch (error) { return failure(error); }
  finally { store?.close(); }
}

/** Covers are fetched independently so a directory never downloads material galleries. */
export async function handleEditorialCover(request, id, defaults, { dataDir, now, env = process.env } = {}) {
  let store;
  try {
    if (request.method !== "GET") return response({ error: "invalid_request" }, 405, { Allow: "GET" });
    verifyOrigin(request, env);
    store = await openSiteAdminStore({ dataDir, now, env });
    const saved = await store.readEditorialCover(id);
    if (!saved?.image || (defaults?.id !== id && (!dynamicDocument(saved) || saved.id !== id))) return response({ error: "not_found" }, 404);
    const image = images([saved.image])[0];
    if (isEditorialMediaPath(image.src)) return new Response(null, { status: 307, headers: { Location: image.src, "Cache-Control": "no-store" } });
    return new Response(Buffer.from(image.src.slice(23), "base64"), { headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return failure(error); }
  finally { store?.close(); }
}
