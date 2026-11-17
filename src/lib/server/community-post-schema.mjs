import { randomUUID } from "node:crypto";
import { parsePublishedCommunityPost, COMMUNITY_IMAGE_LIMIT } from "../community-published-schema.mjs";
import { GUIDE_MEDIA_ENCODED_LIMIT, GUIDE_MEDIA_EDGE_LIMIT } from "../guide-media-limits.mjs";
import { isStagedCommunityUploadPath } from "../site-media-paths.mjs";

export class CommunityPostEditError extends Error {
  constructor(code = "invalid_request", status = 400) { super(code); this.code = code; this.status = status; }
}
const reject = () => { throw new CommunityPostEditError(); };
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const sameCredit = (value, original) => original === undefined ? value === undefined : record(value)
  && ["name", "url", "license", "licenseUrl"].every(key => value[key] === original[key]);

/** Uploaded JPEGs must match the dimensions the browser will use for layout. */
export function jpegBytes(image) {
  if (image.src.length > GUIDE_MEDIA_ENCODED_LIMIT) throw new CommunityPostEditError("content_size", 413);
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image.src)) reject();
  const encoded = image.src.slice(23);
  if (encoded.length % 4 !== 0) reject();
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) reject();
  let frame;
  let offset = 2;
  while (offset < bytes.length - 2) {
    if (bytes[offset++] !== 255) reject();
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    if (offset + 2 > bytes.length) reject();
    const size = bytes.readUInt16BE(offset);
    if (size < 2 || offset + size > bytes.length) reject();
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (size < 8) reject();
      frame = { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
      break;
    }
    offset += size;
  }
  if (!frame || frame.width !== image.width || frame.height !== image.height
    || ![frame.width, frame.height].every(value => value > 0 && value <= GUIDE_MEDIA_EDGE_LIMIT)) reject();
  return bytes;
}

/** Edits retain identity and existing photo provenance; uploads get new immutable file names. */
export function preparePublishedCommunityEdit(value, current, { allowStaged = false } = {}) {
  if (!record(value) || value.id !== current.id || value.createdAt !== current.createdAt
    || value.cover !== current.cover || value.demo !== false || current.demo !== false) reject();
  const merged = { ...value };
  for (const field of ["tags", "images", "sources"]) {
    if (!Object.hasOwn(value, field) && Object.hasOwn(current, field)) merged[field] = current[field];
  }
  const uploads = [];
  if (Object.hasOwn(merged, "images")) {
    if (!Array.isArray(merged.images) || merged.images.length > COMMUNITY_IMAGE_LIMIT) reject();
    merged.images = merged.images.map(image => {
      if (!record(image) || typeof image.src !== "string") reject();
      if (image.src.startsWith("data:")) {
        if (Object.hasOwn(image, "credit")) reject();
        const bytes = jpegBytes(image);
        const filename = `${randomUUID()}.jpg`;
        uploads.push({ filename, bytes });
        return { ...image, src: `/media/community/uploads/${filename}` };
      }
      const original = current.images?.find(item => item.id === image.id);
      if (allowStaged && isStagedCommunityUploadPath(image.src) && (!original || image.src !== original.src)) {
        if (Object.hasOwn(image, "credit")) reject();
        return image;
      }
      if (!original || image.src !== original.src || image.width !== original.width || image.height !== original.height
        || !sameCredit(image.credit, original.credit)) reject();
      return image;
    });
  }
  let post;
  try { post = parsePublishedCommunityPost(merged); } catch { reject(); }
  return { post, uploads };
}
