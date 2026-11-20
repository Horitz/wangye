import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const demoId = "demo-first-week";

// Exercise the real TypeScript store without creating generated files.
function loadStore(browser) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} };
    cache.set(filename, compiledModule);
    const output = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const require = name => {
      if (name === "react") return { useSyncExternalStore: (subscribe, getSnapshot) => { subscribe(() => {}); return getSnapshot(); } };
      return load(resolve(dirname(filename), name.endsWith('.mjs') ? name : `${name}.ts`));
    };
    new Function("require", "module", "exports", "window", output)(require, compiledModule, compiledModule.exports, browser);
    return compiledModule.exports;
  }
  return load(resolve(root, "src/lib/community-store.ts"));
}

function memoryStorage(entries = {}) {
  const data = new Map(Object.entries(entries));
  const writes = [];
  return {
    data, writes,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { writes.push(key); data.set(key, value); },
  };
}

const accountId = "alice";
const storageKey = `studentpath:community:v2:${accountId}`;
const legacyKey = `studentpath:community:v1:${accountId}`;
function environment(storage = memoryStorage()) {
  const handlers = new Map();
  const browser = { localStorage: storage, addEventListener: (name, handler) => handlers.set(name, handler) };
  const store = loadStore(browser);
  store.setCommunityOwner(accountId);
  return { store, storage, event: event => handlers.get("storage")?.({ storageArea: storage, ...event }) };
}

function validDraft(store, patch = {}) {
  store.updateCommunityDraft({ title: "我的本地笔记", body: "这是保存在当前浏览器中的一段测试文字。", kind: "note", topic: "daily", ...patch });
}

test("custom tags survive draft refresh, local creation and editing without resetting reactions", () => {
  const { store, storage } = environment();
  validDraft(store, { schoolId: "msu", tags: [" ＃校园 ", "# МГУ", "мгу"] });
  assert.deepEqual(store.useCommunityState().draft.tags, ["校园", "МГУ"]);
  const reloaded = environment(storage).store;
  assert.deepEqual(reloaded.useCommunityState().draft.tags, ["校园", "МГУ"]);
  const id = reloaded.createCommunityPost("msu");
  reloaded.toggleCommunitySave(id); reloaded.addCommunityComment(id, "保留评论");
  assert.deepEqual(reloaded.useCommunityState().posts[0].tags, ["校园", "МГУ"]);
  assert.equal(reloaded.updateCommunityPost(id, { title: "修改笔记标题", body: "这里是修改后的笔记正文，保留原来的评论与收藏。", kind: "note", topic: "daily", schoolId: "msu", tags: ["# Москва", "МОСКВА"] }), true);
  assert.deepEqual(reloaded.useCommunityState().posts[0].tags, ["Москва"]);
  assert.equal(reloaded.updateCommunityPost(id, { title: "旧编辑器修改", body: "旧编辑器没有标签字段，仍然不应清空已有标签。", kind: "note", topic: "daily", schoolId: "msu" }), true);
  assert.deepEqual(reloaded.useCommunityState().posts[0].tags, ["Москва"]);
  const finalStore = environment(storage).store;
  assert.deepEqual(finalStore.useCommunityState().posts[0].tags, ["Москва"]);
  assert.deepEqual(finalStore.useCommunityState().saved, [id]);
  assert.equal(finalStore.useCommunityState().comments[id][0].body, "保留评论");
  const previous = finalStore.useCommunityState().posts[0];
  assert.equal(finalStore.updateCommunityPost(id, { title: previous.title.zh, body: previous.body.zh, kind: previous.kind, topic: previous.topic, schoolId: previous.schoolId, tags: [] }), true);
  assert.deepEqual(finalStore.useCommunityState().posts[0].tags, []);
});

test("invalid tags cannot replace a valid draft or stored note and old records keep their shape", () => {
  const { store, storage } = environment();
  validDraft(store, { schoolId: "msu", tags: ["校园"] });
  const before = store.useCommunityState().draft;
  for (const tags of [null, "校园", [17], ["字".repeat(25)], Array.from({ length: 9 }, (_, n) => `tag-${n}`)]) {
    store.updateCommunityDraft({ tags });
    assert.deepEqual(store.useCommunityState().draft, before);
  }
  const id = store.createCommunityPost("msu");
  assert.equal(store.updateCommunityPost(id, { ...before, tags: ["🚀".repeat(25)] }), false);
  const validRaw = storage.getItem(storageKey);
  const malformed = JSON.parse(validRaw); malformed.posts[0].tags = [false];
  assert.throws(() => store.parseCommunityState(JSON.stringify(malformed)));
  assert.equal(storage.getItem(storageKey), validRaw);
  const old = JSON.parse(validRaw); delete old.posts[0].tags; delete old.draft.tags;
  const parsed = store.parseCommunityState(JSON.stringify(old));
  assert.equal(Object.hasOwn(parsed.posts[0], "tags"), false);
  assert.equal(Object.hasOwn(parsed.draft, "tags"), false);
});

test("first use has twelve bilingual examples and no fabricated engagement or dates", () => {
  const { store, storage } = environment();
  const state = store.useCommunityState();
  assert.equal(state.hydrated, true);
  assert.deepEqual(state.liked, []);
  assert.deepEqual(state.saved, []);
  assert.deepEqual(state.comments, {});
  assert.equal(storage.writes.length, 0);
  const posts = store.getCommunityPosts(state);
  assert.equal(posts.length, 12);
  assert.equal(new Set(posts.map(post => post.id)).size, 12);
  for (const post of posts) {
    assert.equal(post.demo, true);
    assert.equal(post.createdAt, undefined);
    assert.ok(post.title.zh && post.title.ru && post.body.zh.startsWith("示例") && post.body.ru.startsWith("Пример"));
    assert.equal("author" in post, false);
    assert.equal("likes" in post, false);
  }
});

test("the server snapshot remains unhydrated and mutation APIs do not invent accepted work", () => {
  const store = loadStore();
  assert.equal(store.useCommunityState().hydrated, false);
  assert.equal(store.createCommunityPost("msu"), null);
  assert.equal(store.addCommunityComment(demoId, "你好"), false);
  assert.equal(store.setCommunityFeatured(demoId, false), false);
});

test("a draft is retained on validation failure and is cleared only after a valid local post", () => {
  const { store } = environment();
  validDraft(store, { title: "ab" });
  assert.equal(store.createCommunityPost("msu"), null);
  assert.equal(store.useCommunityState().draft.title, "ab");
  validDraft(store, { body: "short" });
  assert.equal(store.createCommunityPost("msu"), null);
  validDraft(store, { title: "  本地留言  ", body: "  这里是一条真实输入的本地测试文字。  ", kind: "discussion", topic: "arrival" });
  const id = store.createCommunityPost("msu");
  const state = store.useCommunityState();
  const post = store.getCommunityPosts(state)[0];
  assert.equal(post.id, id);
  assert.equal(post.title.zh, "本地留言");
  assert.equal(post.title.zh, post.title.ru);
  assert.equal(post.body.zh, post.body.ru, "user text is preserved, not falsely translated");
  assert.equal(post.kind, "discussion");
  assert.equal(post.topic, "arrival");
  assert.equal(post.demo, false);
  assert.ok(Number.isFinite(Date.parse(post.createdAt)));
  assert.deepEqual(state.draft, { title: "", body: "", kind: "note", topic: "daily", schoolId: null });
  assert.equal(store.getCommunityPosts(state).length, 13);
});

test("draft API validates length and enums independently of browser form controls", () => {
  const { store } = environment();
  validDraft(store);
  const before = store.useCommunityState().draft;
  for (const patch of [{ title: "a".repeat(81) }, { body: "a".repeat(3001) }, { kind: "video" }, { topic: "unknown" }]) {
    store.updateCommunityDraft(patch);
    assert.deepEqual(store.useCommunityState().draft, before);
  }
  validDraft(store, { title: "a".repeat(80), body: "b".repeat(3000) });
  assert.ok(store.createCommunityPost("msu"), "exact upper limits are accepted");
  validDraft(store, { title: "   ", body: "              " });
  assert.equal(store.createCommunityPost("msu"), null);
});

test("likes, saves and comments accept only real post IDs and represent actual local actions", () => {
  const { store } = environment();
  store.toggleCommunityLike("unknown");
  store.toggleCommunitySave("__proto__");
  assert.equal(store.addCommunityComment("unknown", "留言"), false);
  assert.equal(store.addCommunityComment(demoId, "   \n  "), false);
  assert.equal(store.addCommunityComment(demoId, "a".repeat(1001)), false);
  store.toggleCommunityLike(demoId);
  store.toggleCommunitySave(demoId);
  assert.deepEqual(store.useCommunityState().liked, [demoId]);
  assert.deepEqual(store.useCommunityState().saved, [demoId]);
  assert.equal(store.addCommunityComment(demoId, "  我自己的评论  "), true);
  assert.equal(store.addCommunityComment(demoId, "a".repeat(1000)), true);
  const comments = store.useCommunityState().comments[demoId];
  assert.equal(comments.length, 2);
  assert.equal(comments[0].body, "我自己的评论");
  assert.notEqual(comments[0].id, comments[1].id);
  store.toggleCommunityLike(demoId);
  store.toggleCommunitySave(demoId);
  assert.deepEqual(store.useCommunityState().liked, []);
  assert.deepEqual(store.useCommunityState().saved, []);
});

test("refresh keeps the complete local workflow, independently of guide/profile records", () => {
  const homeRaw = JSON.stringify({ locale: "ru", saved: ["visa-extension"], completed: { "visa-extension": [0] } });
  const storage = memoryStorage({ "studentpath:home:v2": homeRaw, "studentpath:home:v1": "legacy backup" });
  const { store } = environment(storage);
  validDraft(store);
  const id = store.createCommunityPost("msu");
  store.toggleCommunityLike(id);
  store.toggleCommunitySave(id);
  store.addCommunityComment(id, "刷新后仍然可见");
  store.updateCommunityDraft({ title: "未完成的草稿" });
  const refreshed = environment(storage).store.useCommunityState();
  assert.deepEqual(refreshed, store.useCommunityState());
  assert.equal(storage.getItem("studentpath:home:v2"), homeRaw);
  assert.equal(storage.getItem("studentpath:home:v1"), "legacy backup");
  assert.ok(storage.writes.every(key => key === storageKey));
});

test("read-before-write preserves another tab's latest independent likes and comments", () => {
  const storage = memoryStorage();
  const first = environment(storage).store;
  const second = environment(storage).store;
  first.useCommunityState();
  second.useCommunityState();
  first.toggleCommunityLike(demoId);
  second.addCommunityComment(demoId, "另一窗口的评论");
  first.toggleCommunitySave("demo-study-corner");
  const result = first.useCommunityState();
  assert.deepEqual(result.liked, [demoId]);
  assert.deepEqual(result.saved, ["demo-study-corner"]);
  assert.equal(result.comments[demoId][0].body, "另一窗口的评论");
});

test("storage events sync relevant changes and ignore other keys and storage areas", () => {
  const { store, storage, event } = environment();
  store.useCommunityState();
  const external = { ...store.createInitialCommunityState(), liked: [demoId] };
  storage.setItem(storageKey, JSON.stringify(external));
  event({ key: "studentpath:home:v2" });
  assert.deepEqual(store.useCommunityState().liked, []);
  event({ key: storageKey, storageArea: memoryStorage() });
  assert.deepEqual(store.useCommunityState().liked, []);
  event({ key: storageKey });
  assert.deepEqual(store.useCommunityState().liked, [demoId]);
  storage.data.delete(storageKey);
  event({ key: null });
  assert.deepEqual(store.useCommunityState().liked, []);
});

test("invalid schema, cross references and duplicate IDs are rejected rather than partly accepted", () => {
  const { store } = environment();
  validDraft(store);
  const id = store.createCommunityPost("msu");
  store.addCommunityComment(id, "一条评论");
  const valid = store.useCommunityState();
  const invalidRecords = [
    { ...valid, version: 3 },
    { ...valid, posts: [...valid.posts, valid.posts[0]] },
    { ...valid, posts: [{ ...valid.posts[0], demo: true }] },
    { ...valid, posts: [{ ...valid.posts[0], title: { zh: "标题内容", ru: "changed" } }] },
    { ...valid, liked: ["missing"] },
    { ...valid, saved: "wrong type" },
    { ...valid, draft: { ...valid.draft, topic: "invalid" } },
    { ...valid, comments: { missing: [] } },
    { ...valid, comments: { [id]: [{ ...valid.comments[id][0], body: " " }] } },
    { ...valid, comments: { [id]: [{ ...valid.comments[id][0], createdAt: "yesterday" }] } },
    { ...valid, comments: { [id]: [...valid.comments[id], ...valid.comments[id]] } },
  ];
  for (const data of invalidRecords) assert.throws(() => store.parseCommunityState(JSON.stringify(data)));
  assert.throws(() => store.parseCommunityState("{broken"));
  assert.deepEqual(store.parseCommunityState(JSON.stringify(valid)), valid);
});

test("corrupt stored bytes are retained while new actions continue in memory", () => {
  const raw = "{broken user record";
  const { store, storage, event } = environment(memoryStorage({ [storageKey]: raw }));
  assert.equal(store.useCommunityState().storageUnavailable, true);
  validDraft(store);
  const id = store.createCommunityPost("msu");
  assert.ok(id);
  store.toggleCommunitySave(id);
  assert.equal(store.addCommunityComment(id, "内存里的评论"), true);
  event({ key: storageKey });
  assert.equal(store.useCommunityState().posts.length, 1);
  assert.equal(storage.getItem(storageKey), raw);
  assert.equal(storage.writes.length, 0);
});

test("corruption discovered just before a write preserves existing memory and raw storage", () => {
  const { store, storage } = environment();
  validDraft(store);
  storage.data.set(storageKey, "unsupported data");
  const writesBefore = storage.writes.length;
  const id = store.createCommunityPost("msu");
  assert.ok(id);
  assert.equal(store.useCommunityState().storageUnavailable, true);
  assert.equal(storage.getItem(storageKey), "unsupported data");
  assert.equal(storage.writes.length, writesBefore);
});

test("quota failure retains accepted records and subsequent changes in memory", () => {
  const { store, storage } = environment();
  validDraft(store);
  storage.setItem = () => { throw new Error("Quota exceeded"); };
  const id = store.createCommunityPost("msu");
  assert.ok(id);
  store.toggleCommunityLike(id);
  store.addCommunityComment(id, "继续使用本地内存");
  const state = store.useCommunityState();
  assert.equal(state.storageUnavailable, true);
  assert.equal(state.posts.length, 1);
  assert.equal(state.draft.title, "");
  assert.deepEqual(state.liked, [id]);
  assert.equal(state.comments[id].length, 1);
});

test("blocked localStorage access supports the complete flow in memory", () => {
  const store = loadStore({ addEventListener() {}, get localStorage() { throw new Error("Storage blocked"); } });
  store.setCommunityOwner(accountId);
  validDraft(store);
  const id = store.createCommunityPost("msu");
  assert.ok(id);
  store.toggleCommunitySave(id);
  assert.equal(store.addCommunityComment(id, "本地输入"), true);
  const state = store.useCommunityState();
  assert.equal(state.hydrated, true);
  assert.equal(state.storageUnavailable, true);
  assert.deepEqual(state.saved, [id]);
});

test("deleting a local post removes its interactions but cannot remove editorial examples", () => {
  const { store, storage } = environment();
  validDraft(store);
  const id = store.createCommunityPost("msu");
  store.toggleCommunityLike(id);
  store.toggleCommunitySave(id);
  store.addCommunityComment(id, "会随帖子删除");
  store.setCommunityFeatured(id, true);
  store.toggleCommunitySave(demoId);
  store.addCommunityComment(demoId, "另一条保留的留言");
  assert.equal(store.deleteCommunityPost(demoId), false);
  assert.equal(store.deleteCommunityPost("missing"), false);
  assert.equal(store.deleteCommunityPost(id), true);
  assert.equal(store.deleteCommunityPost(id), false);
  const state = store.useCommunityState();
  assert.equal(state.posts.length, 0);
  assert.deepEqual(state.liked, []);
  assert.deepEqual(state.saved, [demoId]);
  assert.equal(Object.hasOwn(state.comments, id), false);
  assert.equal(state.featuredIds.includes(id), false);
  assert.equal(state.comments[demoId][0].body, "另一条保留的留言");
  assert.equal(store.getCommunityPosts(state).length, 12);
  assert.deepEqual(environment(storage).store.useCommunityState(), state);
});

test("only the selected local comment is deleted and the result persists", () => {
  const { store, storage } = environment();
  store.addCommunityComment(demoId, "第一条留言");
  store.addCommunityComment(demoId, "第二条留言");
  const [first, second] = store.useCommunityState().comments[demoId];
  assert.equal(store.deleteCommunityComment("unknown", first.id), false);
  assert.equal(store.deleteCommunityComment(demoId, "unknown"), false);
  assert.equal(store.deleteCommunityComment(demoId, first.id), true);
  assert.equal(store.deleteCommunityComment(demoId, first.id), false);
  assert.deepEqual(store.useCommunityState().comments[demoId], [second]);
  assert.deepEqual(environment(storage).store.useCommunityState().comments[demoId], [second]);
});

test("school communities contain distinct examples and begin by following the profile", () => {
  const { store } = environment();
  const state = store.useCommunityState();
  assert.equal(state.selectedSchool, null);
  for (const school of ["msu", "hse", "rudn"]) {
    const posts = store.getCommunityPosts(state, school);
    assert.ok(posts.filter(post => post.kind === "note").length >= 2);
    assert.ok(posts.filter(post => post.kind === "discussion").length >= 1);
    assert.ok(posts.every(post => post.schoolId === school));
  }
  assert.deepEqual(store.getCommunityPosts(state, "other"), []);
});

test("initial featured content is an explicit editorial selection isolated by school", () => {
  const { store } = environment();
  const state = store.useCommunityState();
  assert.deepEqual(store.getCommunityFeaturedPosts(state, "msu").map(post => post.id), ["demo-first-week", "demo-study-corner", "demo-slow-afternoon"]);
  assert.equal(state.featuredIds.includes("demo-class-notes"), false, "a note is not featured just because it appears early in the feed");
  for (const school of ["msu", "hse", "rudn"]) {
    const posts = store.getCommunityFeaturedPosts(state, school);
    assert.equal(posts.length, 3);
    assert.ok(posts.every(post => post.schoolId === school && post.demo));
  }
  assert.deepEqual(store.getCommunityFeaturedPosts(state, "other"), []);
});

test("local management adds notes or discussions deliberately without altering other schools", () => {
  const { store, storage } = environment();
  const beforeHse = store.getCommunityFeaturedPosts(store.useCommunityState(), "hse");
  assert.equal(store.setCommunityFeatured("missing", true), false);
  assert.equal(store.setCommunityFeatured(demoId, "true"), false);
  assert.equal(store.setCommunityFeatured("demo-before-arrival", true), true);
  assert.equal(store.setCommunityFeatured("demo-before-arrival", true), true);
  assert.equal(store.setCommunityFeatured(demoId, false), true);
  validDraft(store, { schoolId: "other" });
  const id = store.createCommunityPost("other");
  assert.equal(store.getCommunityFeaturedPosts(store.useCommunityState(), "other").length, 0, "creating a post must not automatically feature it");
  assert.equal(store.setCommunityFeatured(id, true), true);
  const state = store.useCommunityState();
  assert.equal(state.featuredIds.filter(postId => postId === "demo-before-arrival").length, 1);
  assert.deepEqual(store.getCommunityFeaturedPosts(state, "hse"), beforeHse);
  assert.deepEqual(store.getCommunityFeaturedPosts(state, "other").map(post => post.id), [id]);
  assert.equal(store.getCommunityFeaturedPosts(state, "msu").some(post => post.id === id), false);
  assert.deepEqual(environment(storage).store.useCommunityState().featuredIds, state.featuredIds);
});

test("clearing a school selection persists empty without restoring editorial defaults", () => {
  const { store, storage } = environment();
  for (const post of store.getCommunityFeaturedPosts(store.useCommunityState(), "msu")) store.setCommunityFeatured(post.id, false);
  const refreshedStore = environment(storage).store;
  assert.deepEqual(refreshedStore.getCommunityFeaturedPosts(refreshedStore.useCommunityState(), "msu"), []);
  for (const id of [...store.useCommunityState().featuredIds]) store.setCommunityFeatured(id, false);
  assert.deepEqual(environment(storage).store.useCommunityState().featuredIds, []);
});

test("v2 additive upgrade seeds editorial picks only when the field was absent", () => {
  const { store } = environment();
  validDraft(store, { schoolId: "hse" });
  store.toggleCommunityLike(demoId);
  store.toggleCommunitySave("demo-study-corner");
  const old = JSON.parse(JSON.stringify(store.useCommunityState()));
  delete old.featuredIds;
  const migrated = store.parseCommunityState(JSON.stringify(old));
  for (const key of ["liked", "saved", "posts", "comments", "draft", "selectedSchool"]) assert.deepEqual(migrated[key], old[key]);
  assert.deepEqual(migrated.featuredIds, store.createInitialCommunityState().featuredIds);
  assert.deepEqual(store.parseCommunityState(JSON.stringify({ ...old, featuredIds: [] })).featuredIds, []);
  for (const featuredIds of [null, "demo-first-week", ["missing"], [42]]) {
    assert.throws(() => store.parseCommunityState(JSON.stringify({ ...old, featuredIds })));
  }
});

test("featured management preserves cross-tab edits and reports memory fallback truthfully", () => {
  const storage = memoryStorage();
  const first = environment(storage).store;
  const second = environment(storage).store;
  first.useCommunityState(); second.useCommunityState();
  first.setCommunityFeatured("demo-class-notes", true);
  second.setCommunityFeatured(demoId, false);
  first.setCommunityFeatured("demo-before-arrival", true);
  assert.ok(first.useCommunityState().featuredIds.includes("demo-class-notes"));
  assert.equal(first.useCommunityState().featuredIds.includes(demoId), false);
  storage.setItem = () => { throw new Error("Quota exceeded"); };
  assert.equal(first.setCommunityFeatured("demo-class-notes", false), true);
  assert.equal(first.useCommunityState().storageUnavailable, true);
  assert.equal(first.useCommunityState().featuredIds.includes("demo-class-notes"), false);
});

test("shared cache enables persistent local reactions without importing private drafts or duplicating posts", () => {
  const publisher = environment().store;
  validDraft(publisher, { schoolId: "hse" });
  const id = publisher.createCommunityPost("hse");
  const published = publisher.useCommunityState().posts[0];
  const { store, storage } = environment();
  validDraft(store, { title: "访客自己的私密草稿", schoolId: "rudn" });
  const draft = store.useCommunityState().draft;
  assert.equal(store.syncSharedCommunityPosts([published]), true);
  const writes = storage.writes.length;
  assert.equal(store.syncSharedCommunityPosts([published]), true);
  assert.equal(storage.writes.length, writes, "unchanged GET cache does not write again");
  store.toggleCommunityLike(id); store.toggleCommunitySave(id); store.addCommunityComment(id, "仅在我的浏览器里");
  const state = store.useCommunityState();
  assert.deepEqual(state.draft, draft);
  assert.equal(state.posts.length, 0, "shared copies do not become owned local originals");
  assert.deepEqual(state.liked, [id]); assert.deepEqual(state.saved, [id]);
  assert.equal(store.getCommunityPosts(state, "hse").filter(post => post.id === id).length, 1);
  assert.deepEqual(environment(storage).store.useCommunityState(), state);
  store.syncSharedCommunityPosts([]);
  assert.equal(store.useCommunityState().sharedPosts.length, 1, "cached history survives temporarily missing server entries");
});

test("deleting an original keeps its published copy and local reactions", () => {
  const { store, storage } = environment();
  validDraft(store); const id = store.createCommunityPost("msu");
  const original = store.useCommunityState().posts[0];
  store.syncSharedCommunityPosts([original]);
  store.toggleCommunitySave(id); store.toggleCommunityLike(id); store.addCommunityComment(id, "评论仍保留");
  assert.equal(store.getCommunityPosts(store.useCommunityState()).filter(post => post.id === id).length, 1);
  assert.equal(store.deleteCommunityPost(id), true);
  const state = store.useCommunityState();
  assert.equal(state.posts.length, 0); assert.equal(state.sharedPosts.length, 1);
  assert.ok(store.getCommunityPosts(state).some(post => post.id === id));
  assert.deepEqual(state.saved, [id]); assert.deepEqual(state.liked, [id]); assert.equal(state.comments[id].length, 1);
  assert.equal(store.deleteCommunityPost(id), false, "visitors cannot delete shared copies");
  assert.deepEqual(environment(storage).store.useCommunityState(), state);
});

test("editing a browser-owned note preserves identity, interactions, draft, and published copy", () => {
  const { store, storage } = environment();
  validDraft(store, { schoolId: "hse" });
  const id = store.createCommunityPost("hse");
  const original = store.useCommunityState().posts[0];
  store.syncSharedCommunityPosts([original]);
  store.toggleCommunitySave(id); store.toggleCommunityLike(id); store.addCommunityComment(id, "自己的评论");
  validDraft(store, { title: "另一份尚未提交的草稿", schoolId: "rudn" });
  const draft = store.useCommunityState().draft;
  assert.equal(store.updateCommunityPost(id, { title: "  改过的校园日常  ", body: "  这是修改之后的本机笔记，内容不会替换已发布的副本。  ", schoolId: "msu", topic: "campus", kind: "note" }), true);
  const state = store.useCommunityState();
  assert.equal(state.posts.length, 1);
  assert.equal(state.posts[0].id, original.id);
  assert.equal(state.posts[0].createdAt, original.createdAt);
  assert.equal(state.posts[0].schoolId, "msu");
  assert.deepEqual(state.posts[0].title, { zh: "改过的校园日常", ru: "改过的校园日常" });
  assert.equal(state.posts[0].body.zh, state.posts[0].body.ru);
  assert.equal(state.posts[0].body.zh, state.posts[0].body.zh.trim());
  assert.deepEqual(state.draft, draft);
  assert.deepEqual(state.sharedPosts, [original]);
  assert.deepEqual(state.saved, [id]); assert.deepEqual(state.liked, [id]);
  assert.equal(state.comments[id][0].body, "自己的评论");
  assert.deepEqual(environment(storage).store.useCommunityState(), state);
});

test("editing cannot claim a shared post or example, and invalid changes keep the original", () => {
  const { store, storage } = environment();
  validDraft(store);
  const id = store.createCommunityPost("msu");
  const original = store.useCommunityState().posts[0];
  const valid = { title: "修改后的内容", body: "这是一段长度足够的测试正文。", schoolId: "msu", topic: "daily", kind: "note" };
  for (const patch of [{ title: "ab" }, { body: "short" }, { schoolId: null }, { schoolId: "invalid" }, { topic: "invalid" }, { title: "x".repeat(81) }]) {
    assert.equal(store.updateCommunityPost(id, { ...valid, ...patch }), false);
    assert.deepEqual(store.useCommunityState().posts[0], original);
  }
  store.syncSharedCommunityPosts([{ ...original, id: "community-shared-only" }]);
  const writes = storage.writes.length;
  for (const target of [demoId, "community-shared-only", "community-missing"]) assert.equal(store.updateCommunityPost(target, valid), false);
  assert.equal(storage.writes.length, writes);
  assert.deepEqual(store.useCommunityState().sharedPosts[0].title, original.title);
  assert.equal(loadStore().updateCommunityPost(id, valid), false);
});

test("the optional shared cache is strict, while older v2 records still load unchanged", () => {
  const { store } = environment();
  validDraft(store); store.createCommunityPost("rudn");
  const state = store.useCommunityState();
  const old = { ...state }; delete old.sharedPosts;
  assert.deepEqual(store.parseCommunityState(JSON.stringify(old)).sharedPosts, []);
  for (const sharedPosts of [null, {}, [state.posts[0], state.posts[0]], [{ ...state.posts[0], schoolId: "invalid" }]]) {
    assert.throws(() => store.parseCommunityState(JSON.stringify({ ...state, sharedPosts })));
  }
  assert.equal(store.syncSharedCommunityPosts([{ ...state.posts[0], schoolId: "invalid" }]), false);
  assert.deepEqual(store.useCommunityState().sharedPosts, []);
});

test("bilingual site photos survive caching and reload without becoming local originals", () => {
  const { store, storage } = environment();
  const post = {
    id: 'community-campus-photos', schoolId: 'msu', kind: 'note', topic: 'campus',
    title: { zh: '校园里的春天', ru: 'Весна в кампусе' },
    body: { zh: '沿着校园的小路散步，记录眼前的风景。', ru: 'Прогулка по дорожкам кампуса и фотографии весеннего пейзажа.' },
    cover: null, demo: false, createdAt: '2026-11-17T10:00:00.000Z',
    author: { zh: 'StudentPath 编辑', ru: 'Редакция StudentPath' },
    images: [{ id: 'campus-photo-1', src: '/media/community/msu/spring-1.jpg', width: 1200, height: 800, caption: { zh: '校园小路', ru: 'Дорожка кампуса' } }],
    sources: [{ label: { zh: '校园介绍', ru: 'О кампусе' }, url: 'https://www.msu.ru/' }],
  };
  assert.equal(store.isValidLocalCommunityPost(post), false, 'published bilingual support does not relax local drafts');
  assert.equal(store.isValidLocalCommunityPost({ ...post, title: { zh: post.title.zh, ru: post.title.zh }, body: { zh: post.body.zh, ru: post.body.zh } }), false, 'site media fields are not accepted as an owned local original');
  assert.equal(store.syncSharedCommunityPosts([post]), true);
  store.toggleCommunitySave(post.id);
  assert.deepEqual(store.useCommunityState().sharedPosts, [post]);
  assert.equal(store.useCommunityState().posts.length, 0);
  assert.deepEqual(environment(storage).store.useCommunityState().sharedPosts, [post]);
  post.images[0].caption.zh = 'outside mutation';
  assert.equal(store.useCommunityState().sharedPosts[0].images[0].caption.zh, '校园小路', 'cache owns a detached image record');
  const before = JSON.stringify(store.useCommunityState());
  assert.equal(store.syncSharedCommunityPosts([{ ...post, images: [{ ...post.images[0], src: 'https://example.com/photo.jpg' }] }]), false);
  assert.equal(JSON.stringify(store.useCommunityState()), before);
});

test("school browsing never moves a bound draft and creation rejects mismatched destinations", () => {
  const { store, storage } = environment();
  validDraft(store, { schoolId: "hse" });
  store.setCommunitySchool("rudn");
  assert.equal(store.useCommunityState().selectedSchool, "rudn");
  assert.equal(store.useCommunityState().draft.schoolId, "hse");
  assert.equal(store.createCommunityPost("rudn"), null);
  assert.equal(store.createCommunityPost("invalid"), null);
  const id = store.createCommunityPost("hse");
  assert.ok(id);
  assert.equal(store.getCommunityPosts(store.useCommunityState(), "hse")[0].id, id);
  assert.ok(!store.getCommunityPosts(store.useCommunityState(), "rudn").some(post => post.id === id));
  store.setCommunitySchool("invalid");
  assert.equal(store.useCommunityState().selectedSchool, "rudn");
  store.setCommunitySchool(null);
  assert.equal(store.useCommunityState().selectedSchool, null);
  assert.equal(environment(storage).store.useCommunityState().posts[0].schoolId, "hse");
});

function makeLegacyCommunity(store) {
  validDraft(store);
  const id = store.createCommunityPost("msu");
  store.toggleCommunitySave(id);
  store.toggleCommunityLike(demoId);
  store.addCommunityComment(id, "迁移后保留的评论");
  validDraft(store, { title: "迁移前的草稿" });
  const legacy = JSON.parse(JSON.stringify(store.useCommunityState()));
  legacy.version = 1;
  delete legacy.selectedSchool;
  delete legacy.featuredIds;
  delete legacy.sharedPosts;
  delete legacy.draft.schoolId;
  for (const post of legacy.posts) delete post.schoolId;
  return legacy;
}

test("v1 migration preserves posts and interactions in MSU and retains the untouched backup", () => {
  const seed = environment().store;
  const legacy = makeLegacyCommunity(seed);
  const raw = JSON.stringify(legacy);
  const storage = memoryStorage({ [legacyKey]: raw });
  const migrated = environment(storage).store.useCommunityState();
  assert.equal(migrated.version, 2);
  assert.equal(migrated.selectedSchool, null);
  assert.equal(migrated.posts[0].schoolId, "msu");
  assert.equal(migrated.draft.schoolId, "msu");
  for (const key of ["liked", "saved", "comments"]) assert.deepEqual(migrated[key], legacy[key]);
  assert.equal(storage.getItem(legacyKey), raw);
  assert.equal(JSON.parse(storage.getItem(storageKey)).posts[0].id, legacy.posts[0].id);
  assert.deepEqual(storage.writes, [storageKey]);
});

test("corrupt v2 does not fall back to v1 and no corrupt record is overwritten", () => {
  const seed = environment().store;
  const legacy = JSON.stringify(makeLegacyCommunity(seed));
  const storage = memoryStorage({ [legacyKey]: legacy, [storageKey]: "bad v2" });
  const { store } = environment(storage);
  assert.equal(store.useCommunityState().storageUnavailable, true);
  assert.equal(store.useCommunityState().posts.length, 0);
  store.setCommunitySchool("hse");
  assert.equal(storage.getItem(storageKey), "bad v2");
  assert.equal(storage.getItem(legacyKey), legacy);
  assert.equal(storage.writes.length, 0);
});

test("migration quota failure keeps the migrated records usable in memory", () => {
  const seed = environment().store;
  const legacy = JSON.stringify(makeLegacyCommunity(seed));
  const storage = memoryStorage({ [legacyKey]: legacy });
  storage.setItem = () => { throw new Error("full"); };
  const { store } = environment(storage);
  const state = store.useCommunityState();
  assert.equal(state.storageUnavailable, true);
  assert.equal(state.posts.length, 1);
  assert.equal(state.posts[0].schoolId, "msu");
  assert.equal(state.draft.schoolId, "msu");
  assert.equal(storage.getItem(legacyKey), legacy);
  store.setCommunitySchool("rudn");
  assert.equal(store.useCommunityState().selectedSchool, "rudn");
  assert.equal(store.useCommunityState().posts.length, 1);
});

test("v2 rejects invalid schools in posts, drafts, and selected community", () => {
  const { store } = environment();
  validDraft(store);
  store.createCommunityPost("hse");
  const state = store.useCommunityState();
  for (const value of [
    { ...state, selectedSchool: "unknown" },
    { ...state, selectedSchool: undefined },
    { ...state, posts: [{ ...state.posts[0], schoolId: null }] },
    { ...state, posts: [{ ...state.posts[0], schoolId: "unknown" }] },
    { ...state, draft: { ...state.draft, schoolId: "unknown" } },
  ]) assert.throws(() => store.parseCommunityState(JSON.stringify(value)));
});

test("corrupt legacy bytes are not overwritten or silently migrated", () => {
  const storage = memoryStorage({ [legacyKey]: "{broken old data" });
  const { store } = environment(storage);
  assert.equal(store.useCommunityState().storageUnavailable, true);
  store.setCommunitySchool("hse");
  assert.equal(storage.getItem(legacyKey), "{broken old data");
  assert.equal(storage.getItem(storageKey), null);
  assert.equal(storage.writes.length, 0);
});

test("current v2 selection takes priority over a retained v1 backup", () => {
  const seed = environment().store;
  const legacy = JSON.stringify(makeLegacyCommunity(seed));
  const current = { ...seed.createInitialCommunityState(), selectedSchool: "rudn" };
  const storage = memoryStorage({ [legacyKey]: legacy, [storageKey]: JSON.stringify(current) });
  const { store } = environment(storage);
  assert.equal(store.useCommunityState().selectedSchool, "rudn");
  assert.equal(store.useCommunityState().posts.length, 0);
  assert.equal(storage.writes.length, 0);
});

test("switching members hides private drafts and notes, even when older shared keys remain", () => {
  const seed = environment().store;
  const original = JSON.stringify(makeLegacyCommunity(seed));
  const storage = memoryStorage({ [seed.LEGACY_COMMUNITY_STORAGE_KEY]: original });
  const { store } = environment(storage);
  validDraft(store, { schoolId: "msu" });
  const post = store.createCommunityPost("msu");
  store.updateCommunityDraft({ title: "Alice draft" });
  store.setCommunityOwner(null);
  assert.deepEqual(store.useCommunityState().posts, []);
  assert.equal(store.useCommunityState().draft.title, "");
  store.setCommunityOwner("bob");
  assert.equal(store.deleteCommunityPost(post), false);
  store.updateCommunityDraft({ title: "Bob draft" });
  store.setCommunityOwner(accountId);
  assert.equal(store.useCommunityState().posts[0].id, post);
  assert.equal(store.useCommunityState().draft.title, "Alice draft");
  assert.equal(storage.getItem(seed.LEGACY_COMMUNITY_STORAGE_KEY), original);
});
