"use client";

import { useCallback, useSyncExternalStore } from "react";
import { inspectIdentityImage } from "@/lib/personal-identity-store";
import { guidePreviews } from "@/data/home-content";
import { getGuideReaderContent } from "@/data/guide-reader-content";
import { GUIDE_MEDIA_LIMIT, GUIDE_MEDIA_FILE_LIMIT, GUIDE_MEDIA_EDGE_LIMIT, GUIDE_MEDIA_ENCODED_LIMIT, GUIDE_MEDIA_CAPTION_LIMIT } from "@/lib/guide-media-limits.mjs";

export { GUIDE_MEDIA_LIMIT, GUIDE_MEDIA_FILE_LIMIT, GUIDE_MEDIA_EDGE_LIMIT, GUIDE_MEDIA_ENCODED_LIMIT, GUIDE_MEDIA_CAPTION_LIMIT };
export type GuideMediaImage = { id: string; src: string; width: number; height: number; caption: string };
export type GuideMediaRecord = { version: 1; images: GuideMediaImage[] };
export type GuideMediaSnapshot = GuideMediaRecord & { hydrated: boolean; storageUnavailable: boolean };
export type GuideMediaBackend = { read: (guideId: string) => Promise<unknown>; write: (guideId: string, record: GuideMediaRecord) => Promise<void> };
export type GuideMediaSaveResult = "saved" | "memory" | "invalid";
const initial: GuideMediaSnapshot = { version: 1, images: [], hydrated: false, storageUnavailable: false };
const recordLike = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const validGuideId = (id: string) => /^[a-z][a-z0-9-]{0,63}$/.test(id);
const stepMediaKeys = new Set(guidePreviews.flatMap(guide => getGuideReaderContent(guide).steps.map(step => `step:${guide.id}:${step.id}`)));
const validMediaKey = (key: string) => validGuideId(key) || stepMediaKeys.has(key);

/** Stable step IDs isolate each material gallery from the cover and all other steps. */
export function getGuideStepMediaKey(guideId: string, stepId: string): string {
  const key = `step:${guideId}:${stepId}`;
  if (!stepMediaKeys.has(key)) throw new Error("invalid-guide-step");
  return key;
}

export function parseGuideMedia(value: unknown): GuideMediaRecord {
  if (value === undefined || value === null) return { version: 1, images: [] };
  if (!recordLike(value) || value.version !== 1 || !Array.isArray(value.images) || value.images.length > GUIDE_MEDIA_LIMIT) throw new Error("record");
  const ids = new Set<string>();
  const images = value.images.map((image: unknown): GuideMediaImage => {
    if (!recordLike(image) || typeof image.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(image.id) || ids.has(image.id)
      || typeof image.caption !== "string" || image.caption.length > GUIDE_MEDIA_CAPTION_LIMIT || /\p{Cc}/u.test(image.caption)
      || typeof image.src !== "string" || image.src.length > GUIDE_MEDIA_ENCODED_LIMIT
      || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image.src)) throw new Error("record");
    const encoded = image.src.slice(23);
    if (encoded.length % 4 !== 0) throw new Error("record");
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const size = inspectIdentityImage(bytes, "image/jpeg");
    if (bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217
      || size.width > GUIDE_MEDIA_EDGE_LIMIT || size.height > GUIDE_MEDIA_EDGE_LIMIT
      || size.width !== image.width || size.height !== image.height) throw new Error("record");
    ids.add(image.id);
    return { id: image.id, src: image.src, width: size.width, height: size.height, caption: image.caption };
  });
  return { version: 1, images };
}

/** Cover and step galleries each have an atomic record. Failed writes leave database entries intact. */
export function createGuideMediaRepository(backend: GuideMediaBackend) {
  const states = new Map<string, GuideMediaSnapshot>();
  const subscribers = new Map<string, Set<() => void>>();
  const loads = new Map<string, Promise<void>>();
  const notify = (id: string) => subscribers.get(id)?.forEach(listener => listener());
  const getSnapshot = (id: string) => states.get(id) ?? initial;
  const load = (id: string) => {
    if (!validMediaKey(id)) return Promise.resolve();
    if (!loads.has(id)) loads.set(id, (async () => {
      try { states.set(id, { ...parseGuideMedia(await backend.read(id)), hydrated: true, storageUnavailable: false }); }
      catch { states.set(id, { ...getSnapshot(id), hydrated: true, storageUnavailable: true }); }
      notify(id);
    })());
    return loads.get(id)!;
  };
  return {
    getSnapshot,
    load,
    subscribe(id: string, listener: () => void) {
      if (!subscribers.has(id)) subscribers.set(id, new Set());
      subscribers.get(id)!.add(listener);
      void load(id);
      return () => { subscribers.get(id)?.delete(listener); };
    },
    async save(id: string, images: GuideMediaImage[]): Promise<GuideMediaSaveResult> {
      if (!validMediaKey(id)) return "invalid";
      let record: GuideMediaRecord;
      try { record = parseGuideMedia({ version: 1, images }); } catch { return "invalid"; }
      await load(id);
      let unavailable = getSnapshot(id).storageUnavailable;
      if (!unavailable) {
        try { await backend.write(id, record); } catch { unavailable = true; }
      }
      states.set(id, { ...record, hydrated: true, storageUnavailable: unavailable });
      notify(id);
      return unavailable ? "memory" : "saved";
    },
  };
}

let databasePromise: Promise<IDBDatabase> | undefined;
function database() {
  if (!databasePromise) databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open("studentpath-guide-media", 1);
    const timer = window.setTimeout(() => reject(new Error("unavailable")), 4000);
    const fail = () => { window.clearTimeout(timer); reject(new Error("unavailable")); };
    request.onupgradeneeded = () => { request.result.createObjectStore("guides"); };
    request.onerror = fail;
    request.onblocked = fail;
    request.onsuccess = () => {
      window.clearTimeout(timer);
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
  return databasePromise;
}
const repository = createGuideMediaRepository({
  async read(id) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("guides", "readonly");
      const request = transaction.objectStore("guides").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
    });
  },
  async write(id, record) {
    const db = await database();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("guides", "readwrite");
      transaction.objectStore("guides").put(record, id);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  },
});
export function useGuideMedia(guideId: string) {
  return useSyncExternalStore(useCallback(listener => repository.subscribe(guideId, listener), [guideId]), useCallback(() => repository.getSnapshot(guideId), [guideId]), () => initial);
}
export const saveGuideMedia = repository.save;

/** Decode only the accepted raster formats, then reencode without the original filename or metadata. */
export async function prepareGuideImage(file: File): Promise<GuideMediaImage> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("format");
  if (file.size === 0 || file.size > GUIDE_MEDIA_FILE_LIMIT) throw new Error("file-size");
  inspectIdentityImage(new Uint8Array(await file.arrayBuffer()), file.type);
  let bitmap: ImageBitmap | undefined;
  let url: string | undefined;
  try {
    let source: CanvasImageSource;
    let width: number;
    let height: number;
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
      source = bitmap; width = bitmap.width; height = bitmap.height;
    } else {
      url = URL.createObjectURL(file);
      const image = new Image(); image.src = url; await image.decode();
      source = image; width = image.naturalWidth; height = image.naturalHeight;
    }
    if (!width || !height || width > 4096 || height > 4096 || width * height > 16_000_000) throw new Error("dimensions");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("decode");
    let edge = GUIDE_MEDIA_EDGE_LIMIT;
    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, edge / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
      context.fillStyle = "#FFFFFF"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      for (const quality of [.86, .72, .58]) {
        const src = canvas.toDataURL("image/jpeg", quality);
        if (src.length <= GUIDE_MEDIA_ENCODED_LIMIT) {
          const result = { id: crypto.randomUUID(), src, width: canvas.width, height: canvas.height, caption: "" };
          return parseGuideMedia({ version: 1, images: [result] }).images[0];
        }
      }
      edge *= .75;
    }
    throw new Error("file-size");
  } catch (error) {
    if (error instanceof Error && ["file-size", "dimensions"].includes(error.message)) throw error;
    throw new Error("decode");
  } finally { bitmap?.close(); if (url) URL.revokeObjectURL(url); }
}
