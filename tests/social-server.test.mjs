import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openSocialStore, MEMBER_SESSION_COOKIE, MEMBER_SESSION_SECONDS } from "../src/lib/server/social-core.mjs";
import { handleSocialRequest } from "../src/lib/server/social-http.mjs";
import { handleAdminRequest } from "../src/lib/server/admin-http.mjs";
import { handleCommunityComments, handleActivity, handlePublish } from "../src/lib/server/community-comments-http.mjs";
import { openAdminStore, SESSION_COOKIE } from "../src/lib/server/admin-core.mjs";

const origin = "http://127.0.0.1:3000";
const password = "Temporary-social-test-47!";
const profile = { university: "msu", stage: "newArrival", faculty: "physics", degreeLevel: "master", interests: ["documents", "study"], cityId: "moscow" };
const readActions = new Set(["session", "users", "friends-read", "messages-read"]);
function fixture(t) {
  const dataDir = mkdtempSync(join(tmpdir(), "studentpath-social-test-"));
  let time = Date.parse("2026-11-17T12:00:00Z");
  const options = { dataDir, now: () => time, env: { NODE_ENV: "production" } };
  t.after(() => {
    const target = resolve(dataDir);
    assert.ok(target.startsWith(`${resolve(tmpdir())}${sep}`) && basename(target).startsWith("studentpath-social-test-"));
    rmSync(target, { recursive: true, force: true });
  });
  return { dataDir, options, advance: ms => { time += ms; }, store: () => openSocialStore(options) };
}
function request(action, { body, cookie, query = "", method, headers = {}, base = origin } = {}) {
  const verb = method ?? (readActions.has(action) ? "GET" : action === "profile-write" ? "PUT" : "POST");
  return new Request(`${base}/api/social/test${query}`, { method: verb, headers: { ...(verb !== "GET" ? { "content-type": "application/json", origin: base } : {}), ...(cookie ? { cookie } : {}), ...headers }, ...(verb !== "GET" ? { body: JSON.stringify(body ?? {}) } : {}) });
}
const call = (f, action, props) => handleSocialRequest(request(action, props), action, f.options);
async function member(f, username) {
  const result = await call(f, "register", { body: { username, displayName: `同学 ${username}`, password } });
  assert.equal(result.status, 200);
  return { user: (await result.json()).user, cookie: result.headers.get("set-cookie").split(";")[0] };
}
const act = (f, who, other, action) => call(f, "friends-write", { cookie: who.cookie, body: { userId: other.user.id, action } });
async function connect(f, a, b) {
  assert.equal((await act(f, a, b, "request")).status, 200);
  assert.equal((await act(f, b, a, "accept")).status, 200);
}
const send = (f, a, b, body = "你好 / Привет!", clientId = "message-0001") => call(f, "messages-write", { cookie: a.cookie, body: { friendId: b.user.id, body, clientId } });
const messages = (f, a, b, before) => call(f, "messages-read", { cookie: a.cookie, query: `?friendId=${b.user.id}${before === undefined ? "" : `&before=${before}`}` });

test("members publish to a shared school feed, comment and count unique likes across sessions", async t => {
  const f = fixture(t);
  const a = await member(f, "author"), b = await member(f, "reader");
  const id = "community-12345678";
  const draft = { id, schoolId: "msu", topic: "daily", kind: "note", title: "校园里的周末", body: "图书馆门口的花开了，周末散步可以来看看。" };
  const req = (viewer, method, body) => request("community", { cookie: viewer?.cookie, method, body });
  assert.equal((await handlePublish(req(null, "POST", draft), f.options)).status, 401);
  for (let attempt = 0; attempt < 2; attempt++) assert.equal((await handlePublish(req(a, "POST", draft), f.options)).status, 200);
  const site = openAdminStore(f.options);
  try { const { posts, featuredIds } = site.catalog(); assert.equal(posts.length, 1); assert.equal(posts[0].author.zh, a.user.displayName); assert.equal(featuredIds.length, 0); } finally { site.close(); }
  assert.equal((await handlePublish(req(b, "POST", draft), f.options)).status, 409);
  const like = (who, liked) => handleActivity(req(who, "PUT", { postId: id, liked }), f.options);
  await like(a, true); await like(a, true); await like(b, true);
  const comment = { body: "周末见！", clientId: crypto.randomUUID() };
  const thread = (who, method, body) => handleCommunityComments(req(who, method, body), id, f.options);
  await thread(a, "POST", comment); await thread(a, "POST", comment);
  await thread(b, "POST", { body: "好呀！", clientId: crypto.randomUUID() });
  const { comments } = await (await thread(null, "GET")).json();
  assert.deepEqual(comments.map(row => row.authorId), [a.user.id, b.user.id]);
  const stats = async who => (await handleActivity(req(who, "GET"), f.options)).json();
  assert.equal((await stats(null)).likeCounts[id], 2);
  assert.equal((await stats(b)).commentCounts[id], 2);
  assert.deepEqual((await stats(a)).ownIds, [id]);
  assert.deepEqual((await stats(b)).ownIds, []);
  assert.equal((await thread(b, "DELETE", { commentId: comments[0].id })).status, 404);
  await thread(a, "DELETE", { commentId: comments[0].id }); await like(b, false);
  const final = await stats(b);
  assert.deepEqual([final.likeCounts[id], final.commentCounts[id], final.likedIds.length], [1, 1, 0]);
});

test("no seeded members; signup creates a protected member session and stores hashes only", async t => {
  const f = fixture(t);
  assert.deepEqual(await (await call(f, "session")).json(), { user: null, profile: null });
  const result = await call(f, "register", { body: { username: " Test.Member ", displayName: "同学 Тест", password } });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  const header = result.headers.get("set-cookie");
  assert.match(header, /studentpath_member_session=[\w-]{43}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=28800/);
  const cookie = header.split(";")[0];
  const { user, profile: savedProfile } = await result.json();
  assert.equal(savedProfile, null);
  assert.deepEqual(Object.keys(user), ["id", "username", "displayName"]);
  assert.equal(user.username, "test.member");
  assert.deepEqual(await (await call(f, "session", { cookie })).json(), { user, profile: null });
  assert.deepEqual(await (await call(f, "session", { cookie: `${cookie}; ${cookie}` })).json(), { user: null, profile: null });
  const db = new DatabaseSync(join(f.dataDir, "studentpath.sqlite"));
  try {
    const row = db.prepare("SELECT * FROM member_users").get();
    const session = db.prepare("SELECT * FROM member_sessions").get();
    assert.equal(row.salt.length, 64); assert.equal(row.password_hash.length, 128);
    assert.notEqual(session.token_hash, cookie.split("=")[1]);
    assert.ok(!JSON.stringify(row).includes(password));
  } finally { db.close(); }
});

test("registration validates names and passwords, normalizes duplicates, never grants admin rights", async t => {
  const f = fixture(t);
  for (const [overrides, error] of [[{ username: "a" }, "invalid_username"], [{ username: "x".repeat(33) }, "invalid_username"], [{ displayName: " " }, "invalid_display_name"], [{ displayName: "a\nB" }, "invalid_display_name"], [{ password: "short" }, "invalid_password"]]) {
    const result = await call(f, "register", { body: { username: "normal", displayName: "测试", password, ...overrides } });
    assert.equal(result.status, 400); assert.deepEqual(await result.json(), { error });
  }
  const a = await member(f, "alice");
  assert.equal((await call(f, "register", { body: { username: "ALICE", displayName: "Another", password } })).status, 409);
  const adminRequest = request("session", { cookie: a.cookie });
  assert.deepEqual(await (await handleAdminRequest(adminRequest, "session", f.options)).json(), { authenticated: false, configured: false });
  const forgedAdmin = `${SESSION_COOKIE}=${a.cookie.split("=")[1]}`;
  assert.equal((await handleAdminRequest(request("friends-write", { cookie: forgedAdmin, method: "PUT", body: { postId: "anything", featured: true } }), "featured-write", f.options)).status, 401);
  const admin = openAdminStore(f.options);
  await admin.createAdmin("site-admin", password);
  const adminLogin = await admin.login("site-admin", password);
  admin.close();
  assert.equal((await call(f, "friends-read", { cookie: `${MEMBER_SESSION_COOKIE}=${adminLogin.token}` })).status, 401);
});

test("member sessions rotate, logout revokes, and expire after eight hours", async t => {
  const f = fixture(t); const a = await member(f, "alice");
  const login = await call(f, "login", { cookie: a.cookie, body: { username: "ALICE", password } });
  assert.equal(login.status, 200);
  const nextCookie = login.headers.get("set-cookie").split(";")[0];
  assert.notEqual(nextCookie, a.cookie);
  assert.deepEqual(await (await call(f, "session", { cookie: a.cookie })).json(), { user: null, profile: null });
  f.advance(MEMBER_SESSION_SECONDS * 1000);
  assert.equal((await call(f, "friends-read", { cookie: nextCookie })).status, 401);
  const fresh = await call(f, "login", { body: { username: "alice", password } });
  const freshCookie = fresh.headers.get("set-cookie").split(";")[0];
  const logout = await call(f, "logout", { cookie: freshCookie });
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await call(f, "friends-read", { cookie: freshCookie })).status, 401);
});

test("logout clears an expired or absent session repeatedly but does not revoke another active account", async t => {
  const f = fixture(t); const a = await member(f, "alice"); const b = await member(f, "bob");
  const headers = { "x-studentpath-user": a.user.id };
  const changed = await call(f, "logout", { cookie: b.cookie, headers });
  assert.equal(changed.status, 401);
  assert.deepEqual(await changed.json(), { error: "session_changed" });
  assert.equal(changed.headers.get("set-cookie"), null);
  assert.deepEqual((await (await call(f, "session", { cookie: b.cookie })).json()).user, b.user);
  f.advance(MEMBER_SESSION_SECONDS * 1000);
  for (const cookie of [a.cookie, a.cookie, undefined]) {
    const result = await call(f, "logout", { cookie, headers });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { ok: true });
    assert.match(result.headers.get("set-cookie"), /studentpath_member_session=;.*Max-Age=0/);
  }
  const db = new DatabaseSync(join(f.dataDir, "studentpath.sqlite"));
  try { assert.equal(db.prepare("SELECT COUNT(*) AS total FROM member_sessions WHERE user_id=?").get(a.user.id).total, 0); }
  finally { db.close(); }
});

test("member profile persists across sessions, remains account-bound and is absent from public user objects", async t => {
  const f = fixture(t); const a = await member(f, "alice"); const b = await member(f, "bob");
  const saved = await call(f, "profile-write", { cookie: a.cookie, headers: { "x-studentpath-user": a.user.id }, body: { profile } });
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { profile });
  assert.deepEqual(await (await call(f, "session", { cookie: a.cookie })).json(), { user: a.user, profile });
  assert.deepEqual(await (await call(f, "session", { cookie: b.cookie })).json(), { user: b.user, profile: null });
  assert.deepEqual(await (await call(f, "users", { cookie: b.cookie, query: "?q=alice" })).json(), { users: [a.user] });
  await connect(f, a, b);
  assert.deepEqual(await (await call(f, "friends-read", { cookie: b.cookie })).json(), { friends: [a.user], incoming: [], outgoing: [] });
  await call(f, "logout", { cookie: a.cookie });
  const loggedIn = await call(f, "login", { body: { username: "alice", password } });
  assert.deepEqual(await loggedIn.json(), { user: a.user, profile });
  const cookie = loggedIn.headers.get("set-cookie").split(";")[0];
  const store = f.store();
  try { assert.deepEqual(store.profile(cookie.split("=")[1]), profile); } finally { store.close(); }
  const bobProfile = { ...profile, university: "hse", faculty: "", stage: "enrolled" };
  assert.equal((await call(f, "profile-write", { cookie: b.cookie, body: { profile: bobProfile } })).status, 200);
  assert.deepEqual(await (await call(f, "profile-write", { cookie, body: { profile: null } })).json(), { profile: null });
  assert.deepEqual(await (await call(f, "session", { cookie })).json(), { user: a.user, profile: null });
  assert.deepEqual(await (await call(f, "session", { cookie: b.cookie })).json(), { user: b.user, profile: bobProfile });
  assert.deepEqual((await (await call(f, "friends-read", { cookie: b.cookie })).json()).friends, [a.user]);
});

test("profile writes reject unknown choices, foreign faculties and account impersonation without changing saved data", async t => {
  const f = fixture(t); const a = await member(f, "alice"); const b = await member(f, "bob");
  assert.equal((await call(f, "profile-write", { body: { profile } })).status, 401);
  assert.equal((await call(f, "profile-write", { cookie: a.cookie, body: { profile } })).status, 200);
  const invalid = [[], "profile", {}, { ...profile, university: null },
    { ...profile, university: "unknown" }, { ...profile, stage: "" }, { ...profile, degreeLevel: "doctor" },
    { ...profile, university: "hse", faculty: "physics" }, { ...profile, faculty: "unlisted" },
    { ...profile, interests: ["private"] }, { ...profile, interests: "study" }, { ...profile, cityId: "spb" },
    { ...profile, userId: b.user.id }];
  for (const value of invalid) {
    const result = await call(f, "profile-write", { cookie: a.cookie, body: { profile: value } });
    assert.equal(result.status, 400);
    assert.deepEqual(await result.json(), { error: "invalid_profile" });
  }
  assert.equal((await call(f, "profile-write", { cookie: a.cookie, body: { profile, userId: b.user.id } })).status, 400);
  assert.equal((await call(f, "profile-write", { cookie: a.cookie, body: { profile: null }, headers: { "x-studentpath-user": b.user.id } })).status, 401);
  assert.equal((await call(f, "profile-write", { cookie: a.cookie, body: { profile: null }, headers: { origin: "https://foreign.example" } })).status, 403);
  assert.equal((await call(f, "profile-write", { cookie: a.cookie, body: { profile: null }, method: "POST" })).status, 405);
  assert.deepEqual(await (await call(f, "session", { cookie: a.cookie })).json(), { user: a.user, profile });
  assert.deepEqual(await (await call(f, "session", { cookie: b.cookie })).json(), { user: b.user, profile: null });
  const otherSchool = { ...profile, university: "rudn", faculty: "", interests: ["living", "living"] };
  assert.deepEqual(await (await call(f, "profile-write", { cookie: b.cookie, body: { profile: otherSchool } })).json(), { profile: { ...otherSchool, interests: ["living"] } });
});

test("plans follow the signed-in member and reject stale account and revision writes", async t => {
  const f = fixture(t);
  const a = await member(f, "alice"), b = await member(f, "bob");
  const plan = { version: 1, groups: [] };
  const read = cookie => call(f, "plan-read", { method: "GET", cookie });
  const save = (viewer, expected, revision) => handleSocialRequest(request("plan-write", {
    method: "PUT", cookie: viewer.cookie, headers: { "x-studentpath-user": expected },
    body: { revision, plan },
  }), "plan-write", { ...f.options, normalizePlan: value => value });
  assert.equal((await read()).status, 401);
  assert.equal((await save(a, a.user.id, 0)).status, 200);
  assert.equal((await save(a, a.user.id, 0)).status, 409);
  assert.equal((await save(b, a.user.id, 0)).status, 401);
  assert.deepEqual(await (await read(b.cookie)).json(), { revision: 0, plan: null });
  const login = await call(f, "login", { body: { username: "alice", password } });
  const freshCookie = login.headers.get("set-cookie").split(";")[0];
  assert.deepEqual(await (await read(freshCookie)).json(), { revision: 1, plan });
  await call(f, "logout", { cookie: a.cookie });
  assert.equal((await read(a.cookie)).status, 401);
});

test("exact username search is authenticated and exposes no password or other accounts", async t => {
  const f = fixture(t); const a = await member(f, "alice"); const b = await member(f, "bob");
  assert.equal((await call(f, "users", { query: "?q=bob" })).status, 401);
  assert.deepEqual(await (await call(f, "users", { cookie: a.cookie, query: "?q=BOB" })).json(), { users: [b.user] });
  assert.deepEqual(await (await call(f, "users", { cookie: a.cookie, query: "?q=alice" })).json(), { users: [] });
  assert.deepEqual(await (await call(f, "users", { cookie: a.cookie, query: "?q=bob2" })).json(), { users: [] });
  assert.deepEqual(await (await call(f, "users", { cookie: a.cookie, query: "?q=%25" })).json(), { users: [] });
  await connect(f, a, b);
  const c = await member(f, "carol");
  for (const [viewer, target, term] of [[a,c,"＠CAROL"], [c,a,"@alice"], [a,c,c.user.displayName], [c,a,a.user.displayName]]) {
    assert.deepEqual(await (await call(f, "users", { cookie: viewer.cookie, query: "?q=" + encodeURIComponent(term) })).json(), { users: [target.user] });
  }
});

test("friend requests require recipient approval and reject self, third-party and reciprocal shortcuts", async t => {
  const f = fixture(t); const a = await member(f, "alice"); const b = await member(f, "bob"); const c = await member(f, "carol");
  assert.equal((await act(f, a, a, "request")).status, 400);
  assert.equal((await act(f, a, b, "request")).status, 200);
  assert.equal((await act(f, a, b, "request")).status, 200);
  assert.deepEqual(await (await call(f, "friends-read", { cookie: a.cookie })).json(), { friends: [], incoming: [], outgoing: [b.user] });
  assert.deepEqual(await (await call(f, "friends-read", { cookie: b.cookie })).json(), { friends: [], incoming: [a.user], outgoing: [] });
  assert.equal((await act(f, b, a, "request")).status, 409);
  assert.equal((await act(f, a, b, "accept")).status, 409);
  assert.equal((await act(f, c, a, "accept")).status, 409);
  assert.equal((await send(f, a, b)).status, 403);
  assert.equal((await act(f, b, a, "accept")).status, 200);
  assert.deepEqual(await (await call(f, "friends-read", { cookie: a.cookie })).json(), { friends: [b.user], incoming: [], outgoing: [] });
  assert.equal((await act(f, a, b, "request")).status, 409);
  assert.deepEqual(await (await call(f, "friends-read", { cookie: c.cookie })).json(), { friends: [], incoming: [], outgoing: [] });
});

test("requests may be declined or cancelled only by the appropriate participant", async t => {
  const f = fixture(t); const a = await member(f, "alice"); const b = await member(f, "bob");
  await act(f, a, b, "request");
  assert.equal((await act(f, b, a, "cancel")).status, 409);
  assert.equal((await act(f, a, b, "decline")).status, 409);
  assert.equal((await act(f, a, b, "cancel")).status, 200);
  await act(f, a, b, "request");
  assert.equal((await act(f, b, a, "decline")).status, 200);
  assert.deepEqual(await (await call(f, "friends-read", { cookie: a.cookie })).json(), { friends: [], incoming: [], outgoing: [] });
});

test("only accepted participants can send/read; messages persist and retry idempotently", async t => {
  const f = fixture(t); const a = await member(f, "alice"); const b = await member(f, "bob"); const c = await member(f, "carol");
  await connect(f, a, b);
  const sent = await send(f, a, b); assert.equal(sent.status, 200);
  const first = (await sent.json()).message;
  assert.deepEqual((await (await send(f, a, b)).json()).message, first);
  assert.equal((await send(f, a, b, "Different body")).status, 409);
  assert.equal((await send(f, a, b, " ", "empty-msg")).status, 400);
  assert.equal((await send(f, a, b, "x".repeat(2001), "long-msg")).status, 400);
  assert.equal((await send(f, c, a)).status, 403);
  assert.equal((await messages(f, c, a)).status, 403);
  assert.equal((await call(f, "messages-read", { query: `?friendId=${a.user.id}` })).status, 401);
  const reply = (await (await send(f, b, a, "收到，спасибо!", "message-0001")).json()).message;
  assert.equal(reply.senderId, b.user.id);
  assert.deepEqual(await (await messages(f, a, b)).json(), { messages: [first, reply], hasMore: false });
  assert.deepEqual(await (await messages(f, b, a)).json(), { messages: [first, reply], hasMore: false });
  assert.equal((await act(f, a, b, "remove")).status, 200);
  assert.equal((await messages(f, b, a)).status, 403);
  assert.equal((await send(f, b, a, "After removal", "message-0002")).status, 403);
  await connect(f, a, b);
  assert.equal((await (await messages(f, a, b)).json()).messages.length, 2);
});

test("history is bounded and older-page cursors never expose another conversation", async t => {
  const f = fixture(t); const a = await member(f, "alice"); const b = await member(f, "bob"); const c = await member(f, "carol");
  await connect(f, a, b); await connect(f, a, c);
  const store = f.store();
  try {
    for (let i = 0; i < 55; i++) store.sendMessage(a.cookie.split("=")[1], b.user.id, `message ${i}`, `pagination-${i}`);
    store.sendMessage(a.cookie.split("=")[1], c.user.id, "other conversation", "separate-001");
  } finally { store.close(); }
  const latest = await (await messages(f, a, b)).json();
  assert.equal(latest.messages.length, 50); assert.equal(latest.hasMore, true);
  assert.equal(latest.messages[0].body, "message 5");
  const older = await (await messages(f, a, b, latest.messages[0].id)).json();
  assert.equal(older.messages.length, 5); assert.equal(older.hasMore, false);
  assert.equal(older.messages[0].body, "message 0");
  assert.equal((await messages(f, a, b, "0")).status, 400);
  assert.equal((await messages(f, a, b, "9007199254740992")).status, 400);
});

test("origin, payload and account-switch boundaries reject writes without changing state", async t => {
  const f = fixture(t); const a = await member(f, "alice"); const b = await member(f, "bob");
  await connect(f, a, b);
  for (const headers of [{ origin: "https://foreign.example" }, { origin: "" }, { "sec-fetch-site": "cross-site" }, { "content-type": "text/plain" }, { "content-length": "9999999" }]) {
    const result = await call(f, "messages-write", { cookie: a.cookie, headers, body: { friendId: b.user.id, body: "not sent", clientId: "origin-001" } });
    assert.ok([400, 403].includes(result.status));
  }
  const stale = { "x-studentpath-user": b.user.id };
  assert.deepEqual(await (await call(f, "friends-read", { cookie: a.cookie, headers: stale })).json(), { error: "session_changed" });
  assert.equal((await call(f, "messages-write", { cookie: a.cookie, headers: stale, body: { friendId: b.user.id, body: "wrong account", clientId: "owner-0001" } })).status, 401);
  assert.equal((await call(f, "logout", { cookie: a.cookie, headers: stale })).status, 401);
  assert.deepEqual((await (await call(f, "session", { cookie: a.cookie })).json()).user, a.user);
  assert.deepEqual(await (await messages(f, a, b)).json(), { messages: [], hasMore: false });
  assert.equal((await call(f, "register", { body: { username: "injected", displayName: "Test", password, role: "admin" } })).status, 400);
  assert.equal((await call(f, "friends-read", { method: "POST" })).status, 405);
});

test("login throttles are persistent, generic and expire after fifteen minutes", async t => {
  const f = fixture(t); await member(f, "alice");
  for (let i = 0; i < 5; i++) {
    const response = await call(f, "login", { body: { username: "alice", password: "wrong-password" } });
    assert.equal(response.status, 401); assert.deepEqual(await response.json(), { error: "invalid_credentials" });
  }
  const limited = await call(f, "login", { body: { username: "alice", password } });
  assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "900");
  assert.deepEqual(await (await call(f, "login", { body: { username: "nobody", password } })).json(), { error: "invalid_credentials" });
  f.advance(15 * 60 * 1000);
  assert.equal((await call(f, "login", { body: { username: "alice", password } })).status, 200);
});

test("https deployment pins origin and marks member cookie secure", async t => {
  const f = fixture(t);
  const result = await handleSocialRequest(request("register", { base: "https://students.example", body: { username: "alice", displayName: "Alice", password } }), "register", { ...f.options, env: { STUDENTPATH_ORIGIN: "https://students.example" } });
  assert.equal(result.status, 200); assert.match(result.headers.get("set-cookie"), /; Secure$/);
});
