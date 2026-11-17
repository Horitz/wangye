import { parseContentTags } from "./content-tags.mjs";

/** Shared by site imports, server publishing and the browser's public cache. */
export const COMMUNITY_IMAGE_LIMIT = 24;
export const COMMUNITY_IMAGE_EDGE_LIMIT = 3200;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, required, optional = []) => record(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,119}$/i.test(value);
const text = (value, min, max) => typeof value === 'string' && value === value.trim() && value.length >= min && value.length <= max && !value.includes('\0');
const invalid = () => { throw new Error('invalid_request'); };
function localized(value, min, max) {
  if (!exactKeys(value, ['zh', 'ru']) || !text(value.zh, min, max) || !text(value.ru, min, max)) invalid();
  return { zh: value.zh, ru: value.ru };
}
function publicUrl(value) {
  if (!text(value, 1, 2000)) invalid();
  let parsed;
  try { parsed = new URL(value); } catch { invalid(); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) invalid();
  return value;
}
function image(value) {
  if (!exactKeys(value, ['id', 'src', 'width', 'height', 'caption'], ['credit']) || !validId(value.id)
    || !text(value.src, 1, 512) || !/^\/media\/community\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_-]*\.(?:jpe?g|png|webp)$/i.test(value.src)
    || !Number.isInteger(value.width) || value.width < 1 || value.width > COMMUNITY_IMAGE_EDGE_LIMIT
    || !Number.isInteger(value.height) || value.height < 1 || value.height > COMMUNITY_IMAGE_EDGE_LIMIT) invalid();
  const result = { id: value.id, src: value.src, width: value.width, height: value.height, caption: localized(value.caption, 0, 160) };
  if (Object.hasOwn(value, 'credit')) {
    const credit = value.credit;
    if (!exactKeys(credit, ['name', 'url', 'license', 'licenseUrl']) || !text(credit.name, 1, 120) || !text(credit.license, 1, 120)) invalid();
    result.credit = { name: credit.name, url: publicUrl(credit.url), license: credit.license, licenseUrl: publicUrl(credit.licenseUrl) };
  }
  return result;
}

/** Returns a detached, canonical public post; it never upgrades a local draft. */
export function parsePublishedCommunityPost(value) {
  if (!exactKeys(value, ['id', 'schoolId', 'kind', 'topic', 'title', 'body', 'cover', 'demo', 'createdAt'], ['author', 'images', 'sources', 'tags'])
    || !validId(value.id) || value.id.toLowerCase().startsWith('demo-')
    || !['msu', 'hse', 'rudn', 'other'].includes(value.schoolId)
    || !['note', 'discussion'].includes(value.kind) || !['campus', 'daily', 'arrival'].includes(value.topic)
    || value.cover !== null || value.demo !== false
    || typeof value.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt)
    || !Number.isFinite(Date.parse(value.createdAt)) || new Date(value.createdAt).toISOString() !== value.createdAt) invalid();
  const result = {
    id: value.id, schoolId: value.schoolId, kind: value.kind, topic: value.topic,
    title: localized(value.title, 3, 80), body: localized(value.body, 10, 3000),
    cover: null, demo: false, createdAt: value.createdAt,
  };
  if (Object.hasOwn(value, 'tags')) {
    try { result.tags = parseContentTags(value.tags); } catch { invalid(); }
  }
  if (Object.hasOwn(value, 'author')) result.author = localized(value.author, 1, 80);
  if (Object.hasOwn(value, 'images')) {
    if (!Array.isArray(value.images) || value.images.length > COMMUNITY_IMAGE_LIMIT) invalid();
    result.images = value.images.map(image);
    if (new Set(result.images.map(item => item.id)).size !== result.images.length) invalid();
  }
  if (Object.hasOwn(value, 'sources')) {
    if (!Array.isArray(value.sources) || value.sources.length > 12) invalid();
    result.sources = value.sources.map(source => {
      if (!exactKeys(source, ['label', 'url'])) invalid();
      return { label: localized(source.label, 1, 160), url: publicUrl(source.url) };
    });
  }
  return result;
}
