export const MAX_CONTENT_TAGS = 8;
export const MAX_TAG_LENGTH = 24;

/** A tag is display text; its matching key is maintained separately. */
export function normalizeTag(input) {
  if (typeof input !== "string" || input.includes("\0")) throw new Error("invalid_tags");
  const tag = input.normalize("NFKC").trim().replace(/^(?:#\s*)+/u, "").replace(/\s+/gu, " ").trim();
  if ([...tag].length > MAX_TAG_LENGTH) throw new Error("tag_too_long");
  return tag;
}

export function tagKey(input) { return normalizeTag(input).toLowerCase(); }

export function normalizeTags(input) {
  if (!Array.isArray(input)) throw new Error("invalid_tags");
  const tags = [], seen = new Set();
  for (const value of input) {
    const tag = normalizeTag(value);
    if (!tag) continue;
    const key = tagKey(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length > MAX_CONTENT_TAGS) throw new Error("too_many_tags");
  }
  return tags;
}

/** Strict at storage and API boundaries; never coerce numbers or arbitrary objects. */
export function parseContentTags(input) { return normalizeTags(input); }
