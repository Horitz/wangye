"use client";

import { useSyncExternalStore } from "react";
import { communityDemoPosts, communityEditorialFeaturedIds, type CommunityKind, type CommunityPost, type CommunityTopic } from "../data/community-content";
import { isSchoolId, type SchoolId } from "../data/school-options";
import { parsePublishedCommunityPost } from "./community-published-schema.mjs";
import { parseContentTags } from "./content-tags.mjs";

export type CommunityDraft = { title: string; body: string; kind: CommunityKind; topic: CommunityTopic; schoolId: SchoolId | null; tags?: string[] };
export type CommunityComment = { id: string; body: string; createdAt: string };
export type CommunityState = {
  version: 2;
  selectedSchool: SchoolId | null;
  liked: string[];
  saved: string[];
  featuredIds: string[];
  comments: Record<string, CommunityComment[]>;
  posts: CommunityPost[];
  sharedPosts: CommunityPost[];
  draft: CommunityDraft;
  storageUnavailable: boolean;
  hydrated: boolean;
};

export const COMMUNITY_STORAGE_KEY = "studentpath:community:v2";
export const LEGACY_COMMUNITY_STORAGE_KEY = "studentpath:community:v1";
const demoIds = new Set(communityDemoPosts.map(post => post.id));
const emptyDraft = (): CommunityDraft => ({ title: "", body: "", kind: "note", topic: "daily", schoolId: null });

export function createInitialCommunityState(): CommunityState {
  return { version: 2, selectedSchool: null, liked: [], saved: [], featuredIds: [...communityEditorialFeaturedIds], comments: {}, posts: [], sharedPosts: [], draft: emptyDraft(), storageUnavailable: false, hydrated: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validKind(value: unknown): value is CommunityKind { return value === "note" || value === "discussion"; }
function validTopic(value: unknown): value is CommunityTopic { return value === "campus" || value === "daily" || value === "arrival"; }
function validId(value: unknown): value is string { return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/i.test(value); }
function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value));
}
function validText(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value === value.trim() && value.length >= min && value.length <= max;
}
function validTags(value: Record<string, unknown>): boolean {
  if (!Object.hasOwn(value, "tags")) return true;
  try { parseContentTags(value.tags); return true; } catch { return false; }
}
function normalizedTagField(value: { tags?: string[] }): { tags?: string[] } {
  return Object.hasOwn(value, "tags") ? { tags: parseContentTags(value.tags) } : {};
}
function validDraft(value: unknown): value is CommunityDraft {
  return isRecord(value) && typeof value.title === "string" && value.title.length <= 80
    && typeof value.body === "string" && value.body.length <= 3000 && validKind(value.kind) && validTopic(value.topic)
    && (value.schoolId === null || isSchoolId(value.schoolId)) && validTags(value);
}
export function isValidLocalCommunityPost(value: unknown): value is CommunityPost {
  return isRecord(value) && validId(value.id) && !demoIds.has(value.id) && validKind(value.kind) && validTopic(value.topic) && isSchoolId(value.schoolId)
    && isRecord(value.title) && validText(value.title.zh, 3, 80) && value.title.zh === value.title.ru
    && isRecord(value.body) && validText(value.body.zh, 10, 3000) && value.body.zh === value.body.ru
    && value.cover === null && value.demo === false && validDate(value.createdAt) && validTags(value)
    && !["author", "images", "sources"].some(key => Object.hasOwn(value, key));
}
function hasPost(state: CommunityState, id: string) { return demoIds.has(id) || state.posts.some(post => post.id === id) || state.sharedPosts.some(post => post.id === id); }

/** Fail closed on corrupt or unsupported records, preserving the original stored bytes. */
export function parseCommunityState(raw: string | null): CommunityState {
  if (raw === null) return { ...createInitialCommunityState(), hydrated: true };
  let data: unknown = JSON.parse(raw);
  // Old content belonged to the original MSU-only prototype; keep IDs and all interactions.
  if (isRecord(data) && data.version === 1 && Array.isArray(data.posts) && isRecord(data.draft)) {
    data = { ...data, version: 2, selectedSchool: null,
      posts: data.posts.map(post => isRecord(post) ? { ...post, schoolId: "msu" } : post),
      draft: { ...data.draft, schoolId: data.draft.title || data.draft.body ? "msu" : null },
    };
  }
  if (!isRecord(data) || data.version !== 2 || (data.selectedSchool !== null && !isSchoolId(data.selectedSchool)) || !Array.isArray(data.posts) || !data.posts.every(isValidLocalCommunityPost)
    || !Array.isArray(data.liked) || !Array.isArray(data.saved) || !isRecord(data.comments) || !validDraft(data.draft)) {
    throw new Error("Invalid StudentPath community state");
  }
  const posts = data.posts as CommunityPost[];
  const sharedInput = Object.hasOwn(data, "sharedPosts") ? data.sharedPosts : [];
  if (!Array.isArray(sharedInput)) throw new Error("Invalid shared community cache");
  const sharedPosts = sharedInput.map(parsePublishedCommunityPost);
  if (new Set(sharedPosts.map(post => post.id)).size !== sharedPosts.length) throw new Error("Invalid shared community cache");
  // Additive v2 upgrade: absent means old schema; an explicitly empty selection stays empty.
  const featuredIds = Object.hasOwn(data, "featuredIds") ? data.featuredIds : communityEditorialFeaturedIds;
  const postIds = new Set([...demoIds, ...posts.map(post => post.id), ...sharedPosts.map(post => post.id)]);
  if (new Set(posts.map(post => post.id)).size !== posts.length
    || !Array.isArray(featuredIds) || ![...data.liked, ...data.saved, ...featuredIds].every(id => typeof id === "string" && postIds.has(id))) {
    throw new Error("Invalid StudentPath community references");
  }
  const commentIds = new Set<string>();
  for (const [postId, comments] of Object.entries(data.comments)) {
    if (!postIds.has(postId) || !Array.isArray(comments)) throw new Error("Invalid community comments");
    for (const comment of comments) {
      if (!isRecord(comment) || !validId(comment.id) || commentIds.has(comment.id)
        || !validText(comment.body, 1, 1000) || !validDate(comment.createdAt)) throw new Error("Invalid community comment");
      commentIds.add(comment.id);
    }
  }
  return {
    version: 2, selectedSchool: data.selectedSchool, liked: [...new Set(data.liked as string[])], saved: [...new Set(data.saved as string[])],
    featuredIds: [...new Set(featuredIds as string[])],
    posts: posts.map(post => ({ ...post, ...normalizedTagField(post), title: { ...post.title }, body: { ...post.body } })),
    sharedPosts,
    comments: Object.fromEntries(Object.entries(data.comments).map(([id, comments]) => [id, (comments as CommunityComment[]).map(comment => ({ ...comment }))])),
    draft: { title: data.draft.title, body: data.draft.body, kind: data.draft.kind, topic: data.draft.topic, schoolId: data.draft.schoolId, ...normalizedTagField(data.draft) },
    storageUnavailable: false, hydrated: true,
  };
}

export function loadCommunityState(storage: Pick<Storage, "getItem" | "setItem">, fallback = createInitialCommunityState()): CommunityState {
  let loaded = fallback;
  try {
    const raw = storage.getItem(COMMUNITY_STORAGE_KEY);
    if (raw !== null) return parseCommunityState(raw);
    const legacy = storage.getItem(LEGACY_COMMUNITY_STORAGE_KEY);
    loaded = parseCommunityState(legacy);
    if (legacy !== null) storage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(loaded));
    return loaded;
  } catch { return { ...loaded, storageUnavailable: true, hydrated: true }; }
}

export function getCommunityPosts(state: Pick<CommunityState, "posts"> & Partial<Pick<CommunityState, "sharedPosts">>, schoolId?: SchoolId): CommunityPost[] {
  const byId = new Map([...state.posts, ...(state.sharedPosts ?? [])].map(post => [post.id, post]));
  const posts = [...byId.values()].sort((first, second) => (second.createdAt ?? "").localeCompare(first.createdAt ?? "")).concat(communityDemoPosts);
  return schoolId ? posts.filter(post => post.schoolId === schoolId) : posts;
}

export function getCommunityFeaturedPosts(state: Pick<CommunityState, "posts" | "featuredIds">, schoolId: SchoolId): CommunityPost[] {
  const posts = new Map(getCommunityPosts(state, schoolId).map(post => [post.id, post]));
  return state.featuredIds.flatMap(id => posts.has(id) ? [posts.get(id)!] : []);
}

const initial = createInitialCommunityState();
let current = initial;
let initialized = false;
const listeners = new Set<() => void>();
function notify() { listeners.forEach(listener => listener()); }

function readStorage() {
  if (typeof window === "undefined") return;
  try { current = loadCommunityState(window.localStorage, current); }
  catch { current = { ...current, storageUnavailable: true, hydrated: true }; }
}

function handleStorage(event: StorageEvent) {
  if (typeof window === "undefined" || (event.key !== COMMUNITY_STORAGE_KEY && event.key !== LEGACY_COMMUNITY_STORAGE_KEY && event.key !== null)) return;
  // Once in memory-only mode, keep accepted local edits instead of discarding them on an external event.
  if (current.storageUnavailable) return;
  try {
    if (event.storageArea !== null && event.storageArea !== window.localStorage) return;
  } catch {
    current = { ...current, storageUnavailable: true, hydrated: true };
    notify();
    return;
  }
  readStorage();
  notify();
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("storage", handleStorage);
  readStorage();
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initialize();
  return () => { listeners.delete(listener); };
}

function commit(update: (state: CommunityState) => CommunityState) {
  if (typeof window === "undefined") return;
  initialize();
  // Incorporate another tab's latest independent edits before applying this operation.
  if (!current.storageUnavailable) readStorage();
  const next = update(current);
  if (next !== current) {
    current = next;
    if (!current.storageUnavailable) {
      try {
        const { version, selectedSchool, liked, saved, featuredIds, comments, posts, sharedPosts, draft } = current;
        window.localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify({ version, selectedSchool, liked, saved, featuredIds, comments, posts, sharedPosts, draft }));
      } catch { current = { ...current, storageUnavailable: true }; }
    }
  }
  notify();
}

function createId(prefix: string) {
  const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${suffix}`;
}

export function toggleCommunityLike(id: string) {
  commit(state => hasPost(state, id) ? { ...state, liked: state.liked.includes(id) ? state.liked.filter(item => item !== id) : [...state.liked, id] } : state);
}

export function toggleCommunitySave(id: string) {
  commit(state => hasPost(state, id) ? { ...state, saved: state.saved.includes(id) ? state.saved.filter(item => item !== id) : [...state.saved, id] } : state);
}

/** Called only after a validated server GET. Cache supports stable local reactions; it is never published back. */
export function syncSharedCommunityPosts(posts: CommunityPost[]): boolean {
  let sharedPosts: CommunityPost[];
  try { sharedPosts = posts.filter(post => !post.demo).map(parsePublishedCommunityPost); }
  catch { return false; }
  if (new Set(sharedPosts.map(post => post.id)).size !== sharedPosts.length) return false;
  commit(state => {
    // Retain older cached references so a temporarily missing remote record cannot invalidate local history.
    const cache = new Map(state.sharedPosts.map(post => [post.id, post]));
    for (const post of sharedPosts) cache.set(post.id, post);
    const next = [...cache.values()];
    return JSON.stringify(next) === JSON.stringify(state.sharedPosts) ? state : { ...state, sharedPosts: next };
  });
  return true;
}

/** Local management prototype only; accepted does not imply server authorization or durable storage. */
export function setCommunityFeatured(id: string, selected: boolean): boolean {
  if (typeof selected !== "boolean") return false;
  let accepted = false;
  commit(state => {
    if (!hasPost(state, id)) return state;
    accepted = true;
    if (state.featuredIds.includes(id) === selected) return state;
    return { ...state, featuredIds: selected ? [...state.featuredIds, id] : state.featuredIds.filter(postId => postId !== id) };
  });
  return accepted;
}

export function updateCommunityDraft(patch: Partial<CommunityDraft>) {
  commit(state => {
    const draft = { ...state.draft, ...patch };
    return validDraft(draft) ? { ...state, draft: { ...draft, ...normalizedTagField(draft) } } : state;
  });
}

export function clearPublishedDraft(sent: CommunityDraft) {
  commit(state => {
    const currentDraft = state.draft;
    if (currentDraft.title !== sent.title || currentDraft.body !== sent.body || currentDraft.topic !== sent.topic ||
        currentDraft.kind !== sent.kind || currentDraft.schoolId !== sent.schoolId ||
        JSON.stringify(currentDraft.tags ?? []) !== JSON.stringify(sent.tags ?? [])) return state;
    return { ...state, draft: emptyDraft() };
  });
}

export function setCommunitySchool(schoolId: SchoolId | null) {
  if (schoolId !== null && !isSchoolId(schoolId)) return;
  commit(state => state.selectedSchool === schoolId ? state : { ...state, selectedSchool: schoolId });
}

/** Success accepts a local record; storageUnavailable separately reports whether it persisted. */
export function createCommunityPost(schoolId: SchoolId): string | null {
  if (!isSchoolId(schoolId)) return null;
  let result: string | null = null;
  commit(state => {
    const title = state.draft.title.trim();
    const body = state.draft.body.trim();
    if (!validText(title, 3, 80) || !validText(body, 10, 3000) || (state.draft.schoolId !== null && state.draft.schoolId !== schoolId)) return state;
    result = createId("community");
    const post: CommunityPost = {
      id: result, schoolId, kind: state.draft.kind, topic: state.draft.topic, title: { zh: title, ru: title },
      body: { zh: body, ru: body }, cover: null, demo: false, createdAt: new Date().toISOString(),
      ...normalizedTagField(state.draft),
    };
    return { ...state, posts: [post, ...state.posts], draft: emptyDraft() };
  });
  return result;
}

/** Edit only the browser-owned original; a previously published copy stays unchanged. */
export function updateCommunityPost(id: string, draft: CommunityDraft): boolean {
  if (!validDraft(draft) || !isSchoolId(draft.schoolId)) return false;
  const title = draft.title.trim();
  const body = draft.body.trim();
  if (!validText(title, 3, 80) || !validText(body, 10, 3000)) return false;
  let updated = false;
  commit(state => {
    if (!state.posts.some(post => post.id === id)) return state;
    updated = true;
    return { ...state, posts: state.posts.map(post => post.id === id ? {
      ...post, schoolId: draft.schoolId as SchoolId, kind: draft.kind, topic: draft.topic,
      title: { zh: title, ru: title }, body: { zh: body, ru: body },
      ...normalizedTagField(draft),
    } : post) };
  });
  return updated;
}

export function addCommunityComment(id: string, body: string): boolean {
  const text = body.trim();
  if (!validText(text, 1, 1000)) return false;
  let accepted = false;
  commit(state => {
    if (!hasPost(state, id)) return state;
    accepted = true;
    const comments = Object.hasOwn(state.comments, id) ? state.comments[id] : [];
    const comment = { id: createId("comment"), body: text, createdAt: new Date().toISOString() };
    return { ...state, comments: { ...state.comments, [id]: [...comments, comment] } };
  });
  return accepted;
}

export function deleteCommunityPost(id: string): boolean {
  let removed = false;
  commit(state => {
    if (!state.posts.some(post => post.id === id)) return state;
    removed = true;
    const isShared = state.sharedPosts.some(post => post.id === id);
    return {
      ...state, posts: state.posts.filter(post => post.id !== id),
      liked: isShared ? state.liked : state.liked.filter(postId => postId !== id), saved: isShared ? state.saved : state.saved.filter(postId => postId !== id),
      featuredIds: isShared ? state.featuredIds : state.featuredIds.filter(postId => postId !== id),
      comments: isShared ? state.comments : Object.fromEntries(Object.entries(state.comments).filter(([postId]) => postId !== id)),
    };
  });
  return removed;
}

export function deleteCommunityComment(postId: string, commentId: string): boolean {
  let removed = false;
  commit(state => {
    const comments = Object.hasOwn(state.comments, postId) ? state.comments[postId] : [];
    if (!comments.some(comment => comment.id === commentId)) return state;
    removed = true;
    return { ...state, comments: { ...state.comments, [postId]: comments.filter(comment => comment.id !== commentId) } };
  });
  return removed;
}

export function useCommunityState() {
  return useSyncExternalStore(subscribe, () => current, () => initial);
}
