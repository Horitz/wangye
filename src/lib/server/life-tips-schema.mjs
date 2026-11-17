const CATEGORIES = ["etiquette", "venue", "rule"];
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const shape = (value, required, optional = []) => record(value)
  && required.every(key => Object.hasOwn(value, key))
  && Object.keys(value).every(key => required.includes(key) || optional.includes(key));

export class LifeTipsValidationError extends Error {
  constructor() { super("invalid_request"); }
}
const reject = () => { throw new LifeTipsValidationError(); };
function text(value, max, required = true) {
  if (typeof value !== "string" || value.length > max || value.includes("\0") || (required && !value.trim())) reject();
  return value;
}
function localized(value, max, required = true) {
  if (!shape(value, ["zh", "ru"])) reject();
  return { zh: text(value.zh, max, required), ru: text(value.ru, max, required) };
}
function verifiedDate(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) reject();
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) reject();
  return value;
}

/** A fixed bilingual shape is shared by published defaults and saved site content. */
export function parseLifeTips(value) {
  if (!Array.isArray(value) || value.length > 20) reject();
  const ids = new Set();
  return value.map(tip => {
    if (!shape(tip, ["id", "category", "title", "body", "sources", "verifiedAt"], ["example"])
      || typeof tip.id !== "string" || !/^[a-z][a-z0-9-]{0,79}$/.test(tip.id) || ids.has(tip.id)
      || !CATEGORIES.includes(tip.category) || !Array.isArray(tip.sources) || tip.sources.length > 4) reject();
    ids.add(tip.id);
    return {
      id: tip.id,
      category: tip.category,
      title: localized(tip.title, 80),
      body: localized(tip.body, 1000),
      ...(Object.hasOwn(tip, "example") ? { example: localized(tip.example, 2000, false) } : {}),
      sources: tip.sources.map(source => {
        if (!shape(source, ["label", "url"])) reject();
        const address = text(source.url, 2048).trim();
        let url;
        try { url = new URL(address); } catch { reject(); }
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) reject();
        return { label: localized(source.label, 160), url: address };
      }),
      verifiedAt: verifiedDate(tip.verifiedAt),
    };
  });
}

const contentIdentity = tip => JSON.stringify({
  id: tip.id, category: tip.category, title: tip.title, body: tip.body,
  example: tip.example, sources: tip.sources,
});

/** Editing does not certify a rule: only identical published content keeps its review date. */
export function prepareLifeTips(value, current) {
  const previous = new Map(parseLifeTips(current).map(tip => [tip.id, tip]));
  return parseLifeTips(value).map(tip => {
    const original = previous.get(tip.id);
    return {
      ...tip,
      verifiedAt: original && contentIdentity(original) === contentIdentity(tip) ? original.verifiedAt : null,
    };
  });
}
