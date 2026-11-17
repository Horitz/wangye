"use client";

import { useSyncExternalStore } from "react";

export const PERSONAL_IDENTITY_STORAGE_KEY = "studentpath:personal-identity:v1";
export const IDENTITY_NICKNAME_LIMIT = 32;
export const IDENTITY_FILE_LIMIT = 5 * 1024 * 1024;
export const IDENTITY_IMAGE_EDGE_LIMIT = 4096;
export const IDENTITY_IMAGE_PIXEL_LIMIT = 16_000_000;
export const IDENTITY_AVATAR_SIZE = 256;
export const identityPresets = ["curly", "glasses", "longhair", "beanie"] as const;
export type IdentityPreset = typeof identityPresets[number];
export type PersonalIdentityDraft = { nickname: string; preset: IdentityPreset; photo: string | null };
export type PersonalIdentityState = PersonalIdentityDraft & { version: 1; hydrated: boolean; storageUnavailable: boolean };
export type IdentityImageError = "format" | "file-size" | "dimensions" | "decode";
const MAX_ENCODED_PHOTO = 400_000;
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export function createInitialPersonalIdentity(): PersonalIdentityState {
  return { version: 1, nickname: "", preset: "curly", photo: null, hydrated: false, storageUnavailable: false };
}

function validPhoto(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || value.length > MAX_ENCODED_PHOTO || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const encoded = value.slice(22);
  if (encoded.length < 44 || encoded.length % 4 !== 0) return false;
  try {
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const dimensions = inspectIdentityImage(bytes, "image/png");
    if (dimensions.width !== IDENTITY_AVATAR_SIZE || dimensions.height !== IDENTITY_AVATAR_SIZE) return false;
    const view = new DataView(bytes.buffer);
    let offset = 8;
    let imageData = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      if (offset + 12 + length > bytes.length) return false;
      if (type === "IDAT" && length > 0) imageData = true;
      if (type === "IEND") return imageData && length === 0 && offset + 12 === bytes.length;
      offset += 12 + length;
    }
    return false;
  } catch { return false; }
}

function validDraft(value: unknown): value is PersonalIdentityDraft {
  return isRecord(value) && typeof value.nickname === "string" && value.nickname === value.nickname.trim()
    && value.nickname.length <= IDENTITY_NICKNAME_LIMIT && !/\p{Cc}/u.test(value.nickname)
    && identityPresets.includes(value.preset as IdentityPreset) && validPhoto(value.photo);
}

export function parsePersonalIdentity(raw: string | null): PersonalIdentityState {
  if (raw === null) return { ...createInitialPersonalIdentity(), hydrated: true };
  if (raw.length > MAX_ENCODED_PHOTO + 1024) throw new Error("Invalid personal identity record");
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.version !== 1 || !validDraft(value)) throw new Error("Invalid personal identity record");
  return { version: 1, nickname: value.nickname, preset: value.preset, photo: value.photo, hydrated: true, storageUnavailable: false };
}

export function loadPersonalIdentity(storage: Pick<Storage, "getItem">, fallback = createInitialPersonalIdentity()): PersonalIdentityState {
  try { return parsePersonalIdentity(storage.getItem(PERSONAL_IDENTITY_STORAGE_KEY)); }
  catch { return { ...fallback, hydrated: true, storageUnavailable: true }; }
}

const initial = createInitialPersonalIdentity();
let current = initial;
let initialized = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
function readStorage() {
  try { current = loadPersonalIdentity(window.localStorage, current); }
  catch { current = { ...current, hydrated: true, storageUnavailable: true }; }
}
function onStorage(event: StorageEvent) {
  if (current.storageUnavailable || (event.key !== null && event.key !== PERSONAL_IDENTITY_STORAGE_KEY)) return;
  try { if (event.storageArea !== null && event.storageArea !== window.localStorage) return; }
  catch { current = { ...current, hydrated: true, storageUnavailable: true }; notify(); return; }
  readStorage(); notify();
}
function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true; window.addEventListener("storage", onStorage); readStorage(); notify();
}
function subscribe(listener: () => void) {
  listeners.add(listener); initialize();
  return () => { listeners.delete(listener); };
}
export function usePersonalIdentity() { return useSyncExternalStore(subscribe, () => current, () => initial); }
/** Only this isolated browser record changes; nickname and avatar do not identify a server account. */
export function savePersonalIdentity(draft: PersonalIdentityDraft): "saved" | "memory" | "invalid" {
  if (typeof draft.nickname !== "string") return "invalid";
  const normalized = { ...draft, nickname: draft.nickname.trim() };
  if (typeof window === "undefined" || !validDraft(normalized)) return "invalid";
  initialize();
  if (!current.storageUnavailable) readStorage();
  current = { ...current, ...normalized, hydrated: true };
  if (!current.storageUnavailable) {
    try { window.localStorage.setItem(PERSONAL_IDENTITY_STORAGE_KEY, JSON.stringify({ version: 1, ...normalized })); }
    catch { current = { ...current, storageUnavailable: true }; }
  }
  notify();
  return current.storageUnavailable ? "memory" : "saved";
}

function imageError(code: IdentityImageError): never { throw new Error(code); }
function checkDimensions(width: number, height: number) {
  if (!width || !height || width > IDENTITY_IMAGE_EDGE_LIMIT || height > IDENTITY_IMAGE_EDGE_LIMIT || width * height > IDENTITY_IMAGE_PIXEL_LIMIT) imageError("dimensions");
  return { width, height };
}
/** Read raster dimensions before decoding, so tiny compressed files cannot request enormous canvases. */
export function inspectIdentityImage(bytes: Uint8Array, mime: string): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number, length: number) => String.fromCharCode(...bytes.slice(offset, offset + length));
  if (mime === "image/png") {
    if (bytes.length < 33 || !pngSignature.every((byte, index) => bytes[index] === byte) || view.getUint32(8) !== 13 || ascii(12, 4) !== "IHDR") imageError("format");
    return checkDimensions(view.getUint32(16), view.getUint32(20));
  }
  if (mime === "image/jpeg") {
    if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) imageError("format");
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) imageError("format");
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218 || offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) imageError("format");
      if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) {
        if (length < 8) imageError("format");
        return checkDimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      offset += length;
    }
    imageError("format");
  }
  if (mime === "image/webp") {
    if (bytes.length < 30 || ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WEBP") imageError("format");
    const chunk = ascii(12, 4);
    if (chunk === "VP8X") return checkDimensions(1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16));
    if (chunk === "VP8 " && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return checkDimensions(view.getUint16(26, true) & 16383, view.getUint16(28, true) & 16383);
    if (chunk === "VP8L" && bytes[20] === 47) return checkDimensions(1 + bytes[21] + ((bytes[22] & 63) << 8), 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10));
  }
  return imageError("format");
}

export async function prepareIdentityPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) imageError("format");
  if (file.size === 0 || file.size > IDENTITY_FILE_LIMIT) imageError("file-size");
  inspectIdentityImage(new Uint8Array(await file.arrayBuffer()), file.type);
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;
  try {
    let source: CanvasImageSource;
    let width: number;
    let height: number;
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
      source = bitmap; width = bitmap.width; height = bitmap.height;
    } else {
      objectUrl = URL.createObjectURL(file);
      const image = new Image(); image.src = objectUrl;
      await image.decode();
      source = image; width = image.naturalWidth; height = image.naturalHeight;
    }
    checkDimensions(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = IDENTITY_AVATAR_SIZE; canvas.height = IDENTITY_AVATAR_SIZE;
    const context = canvas.getContext("2d");
    if (!context) imageError("decode");
    const edge = Math.min(width, height);
    context.drawImage(source, (width - edge) / 2, (height - edge) / 2, edge, edge, 0, 0, IDENTITY_AVATAR_SIZE, IDENTITY_AVATAR_SIZE);
    const result = canvas.toDataURL("image/png");
    if (!validPhoto(result)) imageError("decode");
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "dimensions") throw error;
    return imageError("decode");
  } finally { bitmap?.close(); if (objectUrl) URL.revokeObjectURL(objectUrl); }
}
