import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const copy = value => JSON.parse(JSON.stringify(value));
const response = (value, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => copy(value) });

function environment() {
  const cache = new Map();
  const storage = new Map();
  const calls = [];
  const windowEvents = new Map();
  const documentEvents = new Map();
  const browser = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, addEventListener: (name, fn) => windowEvents.set(name, fn), removeEventListener: name => windowEvents.delete(name) };
  const document = { visibilityState: "visible", addEventListener: (name, fn) => documentEvents.set(name, fn), removeEventListener: name => documentEvents.delete(name) };
  const server = { authenticated: false, configured: true, posts: [], featuredIds: [], error: null, sessionError: null, putError: null, holdPut: null };
  async function fetch(path, options) {
    calls.push({ path, options });
    if (path === "/api/admin/session") return server.sessionError ? response({ error: server.sessionError }, 503) : response(server.authenticated ? { authenticated: true, configured: true, username: "admin" } : { authenticated: false, configured: server.configured });
    if (options.method === "PUT") {
      if (server.holdPut) await server.holdPut;
      if (server.putError) return response({ error: server.putError }, server.putError === "unauthorized" ? 401 : 503);
      const body = JSON.parse(options.body);
      if (body.post) server.posts.push(body.post);
      server.featuredIds = body.featured ? [...new Set([...server.featuredIds, body.postId])] : server.featuredIds.filter(id => id !== body.postId);
    }
    return server.error ? response({ error: server.error }, 503) : response({ posts: server.posts, featuredIds: server.featuredIds });
  }
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} }; cache.set(filename, mod);
    const output = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = name => name === "react" ? { useSyncExternalStore: (subscribe, snapshot) => { subscribe(() => {}); return snapshot(); } } : load(resolve(dirname(filename), name.endsWith('.mjs') ? name : `${name}.ts`));
    new Function("require", "module", "exports", "window", "document", "fetch", output)(require, mod, mod.exports, browser, document, fetch);
    return mod.exports;
  }
  const store = load(resolve(root, "src/lib/community-store.ts"));
  const remote = load(resolve(root, "src/lib/community-remote-store.ts"));
  const demos = load(resolve(root, "src/data/community-content.ts")).communityDemoPosts;
  server.posts = copy(demos); server.featuredIds = [demos[0].id];
  return { store, remote, server, storage, calls, demos, windowEvents, documentEvents, document };
}

function localPost(store, schoolId = "hse") {
  store.updateCommunityDraft({ title: "要发布的本机笔记", body: "只有这篇笔记的标题和正文可以被发布到站点。", schoolId, kind: "note", topic: "daily" });
  const id = store.createCommunityPost(schoolId);
  return store.useCommunityState().posts.find(post => post.id === id);
}

test("public snapshot parsing validates references and canonical demos independently of key order", () => {
  const { remote, server } = environment();
  const reordered = server.posts.map(post => Object.fromEntries(Object.entries(post).reverse()));
  assert.equal(remote.parseRemoteCommunitySnapshot({ posts: reordered, featuredIds: server.featuredIds }).posts.length, 12);
  for (const value of [
    { posts: server.posts.slice(1), featuredIds: [] },
    { posts: server.posts, featuredIds: ["missing"] },
    { posts: server.posts, featuredIds: [server.featuredIds[0], server.featuredIds[0]] },
    { posts: [{ ...server.posts[0], body: { zh: "被替换的示例", ru: "replaced" } }, ...server.posts.slice(1)], featuredIds: [] },
  ]) assert.throws(() => remote.parseRemoteCommunitySnapshot(value));
});

test("public snapshots retain bilingual site photos, attribution and sources", async () => {
  const { remote, server, store } = environment();
  const post = {
    id: 'community-msu-landscape', schoolId: 'msu', kind: 'note', topic: 'campus',
    title: { zh: '校园一角的照片', ru: 'Фотографии кампуса' },
    body: { zh: '记录校园一角的建筑与绿树，慢慢看看身边的风景。', ru: 'Здания и деревья в кампусе: небольшой взгляд на окружающий пейзаж.' },
    cover: null, demo: false, createdAt: '2026-11-17T10:00:00.000Z',
    author: { zh: 'StudentPath 编辑', ru: 'Редакция StudentPath' },
    images: [{ id: 'landscape-1', src: '/media/community/msu/landscape.webp', width: 1600, height: 1200, caption: { zh: '校园建筑', ru: 'Здание кампуса' }, credit: { name: 'Photo author', url: 'https://commons.wikimedia.org/wiki/File:Example.jpg', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' } }],
    sources: [{ label: { zh: '大学网站', ru: 'Сайт университета' }, url: 'https://www.msu.ru/' }],
  };
  server.posts.push(post);
  await remote.refreshCommunityRemote();
  assert.equal(remote.getCommunityRemoteSnapshot().status, 'ready');
  assert.deepEqual(remote.getCommunityRemoteSnapshot().posts.find(item => item.id === post.id), post);
  assert.deepEqual(store.useCommunityState().sharedPosts, [post]);
  assert.equal(store.useCommunityState().posts.length, 0);
  const invalid = structuredClone(post);
  invalid.images[0].src = '/media/community/../private.jpg';
  assert.throws(() => remote.parseRemoteCommunitySnapshot({ posts: [...server.posts.filter(item => item.id !== post.id), invalid], featuredIds: [] }), /invalid_response/);
});

test("public reads never use old browser featured selections and session failure is independent", async () => {
  const { store, remote, server } = environment();
  store.setCommunityFeatured("demo-class-notes", true);
  server.featuredIds = [];
  server.sessionError = "unavailable";
  await remote.refreshCommunityRemote();
  assert.equal(remote.getCommunityRemoteSnapshot().status, "ready");
  assert.deepEqual(remote.getCommunityRemoteSnapshot().featuredIds, []);
  assert.equal(remote.getCommunityRemoteSnapshot().sessionStatus, "error");
  server.sessionError = null; server.authenticated = true; server.error = "unavailable";
  await remote.refreshCommunityRemote();
  assert.equal(remote.getCommunityRemoteSnapshot().status, "error");
  assert.equal(remote.getCommunityRemoteSnapshot().sessionStatus, "ready");
  assert.equal(remote.getCommunityRemoteSnapshot().session.authenticated, true);
  assert.deepEqual(remote.getCommunityRemoteSnapshot().featuredIds, [], "GET failure must not fabricate local featured results");
});

test("visitors cannot mutate, and selecting an unpublished post requires an explicit post payload", async () => {
  const { store, remote, server, calls } = environment();
  const post = localPost(store);
  await remote.refreshCommunityRemote();
  assert.deepEqual(await remote.updateRemoteFeatured(server.posts[0].id, false), { ok: false, error: "unauthorized" });
  assert.equal(calls.filter(call => call.options.method === "PUT").length, 0);
  server.authenticated = true; await remote.refreshCommunityRemote();
  assert.deepEqual(await remote.updateRemoteFeatured(post.id, true), { ok: false, error: "invalid_request" });
  assert.deepEqual(await remote.updateRemoteFeatured(server.posts[0].id, true, server.posts[0]), { ok: false, error: "invalid_request" });
  assert.equal(calls.filter(call => call.options.method === "PUT").length, 0);
});

test("explicit publish sends only one post, then GET sync enables shared local reactions", async () => {
  const { store, remote, server, calls } = environment();
  server.authenticated = true;
  const post = localPost(store);
  store.updateCommunityDraft({ title: "不能上传的另一个草稿", body: "另一个私密草稿的正文。", schoolId: "rudn" });
  store.addCommunityComment(post.id, "不上传的本机评论");
  const privateDraft = store.useCommunityState().draft;
  await remote.refreshCommunityRemote();
  const result = await remote.updateRemoteFeatured(post.id, true, { ...post, privateDraft });
  assert.deepEqual(result, { ok: true, refreshed: true });
  const mutation = calls.find(call => call.options.method === "PUT");
  const payload = JSON.parse(mutation.options.body);
  assert.deepEqual(Object.keys(payload).sort(), ["featured", "post", "postId"]);
  assert.deepEqual(payload.post, post);
  assert.equal(mutation.options.credentials, "same-origin");
  assert.equal("Authorization" in mutation.options.headers, false);
  assert.deepEqual(store.useCommunityState().draft, privateDraft);
  assert.equal(store.useCommunityState().sharedPosts[0].id, post.id);
  assert.equal(store.getCommunityPosts(store.useCommunityState()).filter(item => item.id === post.id).length, 1);
  assert.ok(remote.getCommunityRemoteSnapshot().featuredIds.includes(post.id));
  await remote.updateRemoteFeatured(post.id, false);
  assert.ok(remote.getCommunityRemoteSnapshot().posts.some(item => item.id === post.id), "unfeature preserves published copy");
  assert.ok(!remote.getCommunityRemoteSnapshot().featuredIds.includes(post.id));
  const lastMutation = calls.filter(call => call.options.method === "PUT").at(-1);
  assert.deepEqual(JSON.parse(lastMutation.options.body), { postId: post.id, featured: false });
});

test("explicit publication includes normalized tags in the server payload and retained public cache", async () => {
  const { store, remote, server, calls, storage } = environment();
  server.authenticated = true;
  store.updateCommunityDraft({ title: "带标签的本机笔记", body: "这是一篇用来核验自定义标签发布流程的笔记。", schoolId: "hse", tags: ["# 校园", "＃МОСКВА", "москва"] });
  const id = store.createCommunityPost("hse");
  const post = store.useCommunityState().posts.find(item => item.id === id);
  await remote.refreshCommunityRemote();
  assert.deepEqual(await remote.updateRemoteFeatured(id, true, post), { ok: true, refreshed: true });
  assert.deepEqual(JSON.parse(calls.find(call => call.options.method === "PUT").options.body).post.tags, ["校园", "МОСКВА"]);
  assert.deepEqual(remote.getCommunityRemoteSnapshot().posts.find(item => item.id === id).tags, ["校园", "МОСКВА"]);
  assert.deepEqual(store.parseCommunityState(storage.get(store.COMMUNITY_STORAGE_KEY)).sharedPosts.find(item => item.id === id).tags, ["校园", "МОСКВА"]);
});

test("unauthorized mutations do not optimistically change featured state", async () => {
  const { remote, server } = environment();
  server.authenticated = true; await remote.refreshCommunityRemote();
  const before = [...remote.getCommunityRemoteSnapshot().featuredIds];
  server.putError = "unauthorized";
  assert.deepEqual(await remote.updateRemoteFeatured(before[0], false), { ok: false, error: "unauthorized" });
  assert.deepEqual(remote.getCommunityRemoteSnapshot().featuredIds, before);
  assert.equal(remote.getCommunityRemoteSnapshot().session.authenticated, false);
  assert.equal(remote.getCommunityRemoteSnapshot().updatingPostId, null);
});

test("overlapping updates are blocked and become available after completion", async () => {
  const { remote, server, calls } = environment();
  server.authenticated = true; await remote.refreshCommunityRemote();
  let release;
  server.holdPut = new Promise(resolve => { release = resolve; });
  const first = remote.updateRemoteFeatured(server.posts[1].id, true);
  assert.deepEqual(await remote.updateRemoteFeatured(server.posts[2].id, true), { ok: false, error: "busy" });
  assert.equal(calls.filter(call => call.options.method === "PUT").length, 1);
  release(); assert.equal((await first).ok, true);
  assert.equal(remote.getCommunityRemoteSnapshot().updatingPostId, null);
});

test("a new visitor receives shared posts but never the original owner's draft or comments", async () => {
  const owner = environment();
  const post = localPost(owner.store);
  owner.store.addCommunityComment(post.id, "作者的私密本机评论");
  const visitor = environment();
  visitor.server.posts.push(post); visitor.server.featuredIds.push(post.id);
  await visitor.remote.refreshCommunityRemote();
  const state = visitor.store.useCommunityState();
  assert.equal(state.posts.length, 0); assert.equal(state.sharedPosts.length, 1);
  assert.equal(state.draft.title, ""); assert.deepEqual(state.comments, {});
  visitor.store.toggleCommunitySave(post.id);
  assert.deepEqual(visitor.store.useCommunityState().saved, [post.id]);
  assert.deepEqual(owner.store.useCommunityState().saved, []);
});

test("returning to a window or a visible tab refreshes shared selections and admin session", async () => {
  const { remote, server, calls, windowEvents, documentEvents, document } = environment();
  remote.useCommunityRemoteState();
  await remote.refreshCommunityRemote();
  assert.ok(windowEvents.has("focus")); assert.ok(documentEvents.has("visibilitychange"));
  server.authenticated = true;
  server.featuredIds = [server.posts[1].id];
  windowEvents.get("focus")();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(remote.getCommunityRemoteSnapshot().session.authenticated, true);
  assert.deepEqual(remote.getCommunityRemoteSnapshot().featuredIds, server.featuredIds);
  document.visibilityState = "hidden";
  const count = calls.length;
  documentEvents.get("visibilitychange")();
  assert.equal(calls.length, count);
  document.visibilityState = "visible"; server.authenticated = false; server.featuredIds = [];
  documentEvents.get("visibilitychange")();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(remote.getCommunityRemoteSnapshot().session.authenticated, false);
  assert.deepEqual(remote.getCommunityRemoteSnapshot().featuredIds, []);
});
