"use client";

import { useSyncExternalStore } from "react";
import { communityDemoPosts, type CommunityPost } from "../data/community-content";
import { isValidLocalCommunityPost, syncSharedCommunityPosts } from "./community-store";
import { parsePublishedCommunityPost } from "./community-published-schema.mjs";
import { parseContentTags } from "./content-tags.mjs";
import { stageSiteImages } from "./stage-site-images";

export type AdminSession = { authenticated: boolean; configured: boolean; username?: string };
export type RemoteStatus = "idle" | "loading" | "ready" | "error";
export type CommunityRemoteState = {
  status: RemoteStatus;
  posts: CommunityPost[];
  featuredIds: string[];
  commentCounts: Record<string, number>;
  activity: Activity | null;
  error: string | null;
  sessionStatus: RemoteStatus;
  session: AdminSession | null;
  sessionError: string | null;
  updatingPostId: string | null;
};
export type FeaturedUpdateResult = { ok: boolean; error?: string; refreshed?: boolean };
type Activity = { postCount: number; viewerId: string | null; likedIds: string[]; ownIds: string[]; likeCounts: Record<string, number>; commentCounts: Record<string, number> };
const initial: CommunityRemoteState = { status: "idle", posts: [], featuredIds: [], commentCounts: {}, activity: null, error: null, sessionStatus: "idle", session: null, sessionError: null, updatingPostId: null };
let current = initial;
let requestVersion = 0;
const listeners = new Set<() => void>();
const canonicalDemos = new Map(communityDemoPosts.map(post => [post.id, post]));

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

export function parseAdminSession(value: unknown): AdminSession {
  if (!record(value) || typeof value.authenticated !== "boolean" || typeof value.configured !== "boolean"
    || (value.authenticated && (!value.configured || typeof value.username !== "string" || !value.username.trim()))) throw new Error("invalid_response");
  return value.authenticated ? { authenticated: true, configured: value.configured, username: value.username as string } : { authenticated: false, configured: value.configured };
}

export function parseRemoteCommunitySnapshot(value: unknown): Pick<CommunityRemoteState, "posts" | "featuredIds" | "commentCounts"> {
  if (!record(value) || !Array.isArray(value.posts) || !Array.isArray(value.featuredIds)) throw new Error("invalid_response");
  const ids = new Set<string>();
  const posts = value.posts.map((item: unknown): CommunityPost => {
    if (!record(item) || typeof item.id !== "string" || ids.has(item.id)) throw new Error("invalid_response");
    ids.add(item.id);
    const demo = canonicalDemos.get(item.id);
    if (demo) {
      // Demo source text remains canonical, even if a malformed response tries to overwrite it.
      if (item.schoolId !== demo.schoolId || item.kind !== demo.kind || item.topic !== demo.topic || item.cover !== demo.cover || item.demo !== true
        || !record(item.title) || item.title.zh !== demo.title.zh || item.title.ru !== demo.title.ru
        || !record(item.body) || item.body.zh !== demo.body.zh || item.body.ru !== demo.body.ru
        || Object.keys(item).some(key => !Object.hasOwn(demo, key))) throw new Error("invalid_response");
      return demo;
    }
    try { return parsePublishedCommunityPost(item); }
    catch { throw new Error("invalid_response"); }
  });
  if (communityDemoPosts.some(post => !ids.has(post.id)) || new Set(value.featuredIds).size !== value.featuredIds.length
    || !value.featuredIds.every(id => typeof id === "string" && ids.has(id))) throw new Error("invalid_response");
  const counts = value.commentCounts ?? {};
  if (!record(counts) || Object.entries(counts).some(([id, n]) => !ids.has(id) || typeof n !== "number" || !Number.isSafeInteger(n) || n < 0)) throw new Error("invalid_response");
  return { posts, featuredIds: [...value.featuredIds] as string[], commentCounts: counts as Record<string, number> };
}

function update(patch: Partial<CommunityRemoteState>) { current = { ...current, ...patch }; listeners.forEach(listener => listener()); }
export function setPublicCommentCount(id: string, count: number) {
  if (count !== current.commentCounts[id]) update({ commentCounts: { ...current.commentCounts, [id]: count } });
}
async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options, signal: AbortSignal.timeout(10000) });
  const value: unknown = await response.json();
  if (!response.ok) throw new Error(record(value) && typeof value.error === "string" ? value.error : "unavailable");
  return value;
}
function errorCode(error: unknown) { return error instanceof Error ? error.message : "unavailable"; }

/** Session and public content succeed independently; no browser-selected fallback is used. */
export async function refreshCommunityRemote(): Promise<void> {
  if (typeof window === "undefined") return;
  const version = ++requestVersion;
  update({ status: "loading", error: null, sessionStatus: "loading", sessionError: null });
  await Promise.all([
    request("/api/community/featured").then(parseRemoteCommunitySnapshot).then(data => {
      if (version !== requestVersion) return;
      syncSharedCommunityPosts(data.posts);
      update({ ...data, status: "ready", error: null });
    }).catch(error => { if (version === requestVersion) update({ status: "error", error: errorCode(error) }); }),
    request("/api/admin/session").then(parseAdminSession).then(session => {
      if (version === requestVersion) update({ session, sessionStatus: "ready", sessionError: null });
    }).catch(error => { if (version === requestVersion) update({ session: null, sessionStatus: "error", sessionError: errorCode(error) }); }),
  ]);
}

/** Only an explicit publish confirmation may supply a local post. No draft or reactions are sent. */
export async function updateRemoteFeatured(postId: string, featured: boolean, post?: CommunityPost): Promise<FeaturedUpdateResult> {
  if (!current.session?.authenticated || current.sessionStatus !== "ready") return { ok: false, error: "unauthorized" };
  if (current.updatingPostId) return { ok: false, error: "busy" };
  const known = current.posts.some(item => item.id === postId);
  if (typeof featured !== "boolean" || (!known && (!featured || !post)) || (post && (known || !featured || post.id !== postId || !isValidLocalCommunityPost(post)))) return { ok: false, error: "invalid_request" };
  update({ updatingPostId: postId });
  try {
    parseRemoteCommunitySnapshot(await request("/api/community/featured", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, featured, ...(post ? { post: { id: post.id, schoolId: post.schoolId, kind: post.kind, topic: post.topic, title: { zh: post.title.zh, ru: post.title.ru }, body: { zh: post.body.zh, ru: post.body.ru }, cover: post.cover, demo: post.demo, createdAt: post.createdAt, ...(Object.hasOwn(post, "tags") ? { tags: parseContentTags(post.tags) } : {}) } } : {}) }),
    }));
    await refreshCommunityRemote();
    return { ok: true, refreshed: current.status === "ready" };
  } catch (error) {
    const code = errorCode(error);
    if (code === "unauthorized") update({ session: current.session ? { ...current.session, authenticated: false } : null });
    return { ok: false, error: code };
  } finally { update({ updatingPostId: null }); }
}

/** Explicit administrator edits update only this published post, never the browser-owned original. */
export async function updateRemoteCommunityPost(post: CommunityPost): Promise<FeaturedUpdateResult> {
  if (!current.session?.authenticated || current.sessionStatus !== "ready") return { ok: false, error: "unauthorized" };
  if (current.updatingPostId) return { ok: false, error: "busy" };
  if (post.demo || !current.posts.some(item => item.id === post.id && !item.demo)) return { ok: false, error: "not_found" };
  update({ updatingPostId: post.id });
  try {
    const staged = post.images ? { ...post, images: await stageSiteImages(post.images, "community") } : post;
    const snapshot = parseRemoteCommunitySnapshot(await request(`/api/community/posts/${encodeURIComponent(post.id)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post: staged }),
    }));
    // An older background read must not replace the content just saved by this response.
    ++requestVersion;
    syncSharedCommunityPosts(snapshot.posts);
    update({ ...snapshot, status: "ready", error: null, sessionStatus: "ready", sessionError: null });
    return { ok: true, refreshed: true };
  } catch (error) {
    const code = errorCode(error);
    if (code === "unauthorized") update({ session: current.session ? { ...current.session, authenticated: false } : null });
    return { ok: false, error: code };
  } finally { update({ updatingPostId: null }); }
}

let timer: number | undefined;
let activityVersion = 0;
let polling = false;
function acceptActivity(data: Activity) {
  update({ activity: data, commentCounts: data.commentCounts });
}
async function pollActivity() {
  if (polling || document.hidden) return;
  const version = activityVersion;
  polling = true;
  try {
    const data = await request("/api/community/activity") as Activity;
    if (version !== activityVersion) return;
    acceptActivity(data);
    if (current.status === "error" || (current.status === "ready" && data.postCount !== current.posts.length)) void refreshCommunityRemote();
  } catch { /* Retry the live counts on the next visible tick. */ }
  finally { polling = false; }
}
export async function setCommunityPostLike(postId: string, liked: boolean, userId: string) {
  const version = ++activityVersion;
  const activity = await request("/api/community/activity", { method: "PUT", headers: { "Content-Type": "application/json", "X-StudentPath-User": userId }, body: JSON.stringify({ postId, liked }) }) as Activity;
  if (version === activityVersion) { ++activityVersion; acceptActivity(activity); }
}
export async function refreshCommunityActivity() {
  const version = ++activityVersion;
  try {
    const data = await request("/api/community/activity") as Activity;
    if (version === activityVersion) acceptActivity(data);
  } catch { /* The visible polling loop retries. */ }
}
export function resetCommunityViewer() {
  ++activityVersion;
  update({ activity: null });
  if (listeners.size) void refreshCommunityActivity();
}
function onFocus() { if (current.status !== "loading") void refreshCommunityRemote(); void pollActivity(); }
function onVisibility() { if (document.visibilityState === "visible") onFocus(); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    if (typeof window.setInterval === "function") { void pollActivity(); timer = window.setInterval(pollActivity, 5000); }
    void refreshCommunityRemote();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== "undefined") {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval?.(timer);
    }
  };
}

export function getCommunityRemoteSnapshot() { return current; }
export function useCommunityRemoteState() { return useSyncExternalStore(subscribe, () => current, () => initial); }
