import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";
import { openAdminStore, SESSION_COOKIE, SESSION_SECONDS } from "../src/lib/server/admin-core.mjs";
import { handleAdminRequest, verifyOrigin } from "../src/lib/server/admin-http.mjs";
import { COMMUNITY_FEATURED_LIMIT } from "../src/lib/community-limits.mjs";

const source = ts.transpileModule(readFileSync(new URL("../src/data/community-content.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { communityDemoPosts, communityEditorialFeaturedIds } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const testPassword = "Temporary-test-password-47!";
const changedPassword = "Changed-test-password-92!";
const origin = "http://127.0.0.1:3000";
function fixture(t) {
  const dataDir = mkdtempSync(join(tmpdir(), "studentpath-admin-test-"));
  let timestamp = Date.parse("2026-11-16T12:00:00.000Z");
  const options = { dataDir, now: () => timestamp, env: { NODE_ENV: "production" }, seedPosts: communityDemoPosts, seedFeaturedIds: communityEditorialFeaturedIds };
  t.after(() => {
    const target = resolve(dataDir);
    assert.ok(target.startsWith(`${resolve(tmpdir())}${sep}`) && basename(target).startsWith("studentpath-admin-test-"));
    rmSync(target, { recursive: true, force: true });
  });
  return { dataDir, options, advance: ms => { timestamp += ms; }, store: () => openAdminStore(options) };
}
function request(action, { body, cookie, url = origin, headers = {}, method } = {}) {
  const verb = method ?? (action === "session" || action === "featured-read" ? "GET" : action === "featured-write" ? "PUT" : "POST");
  return new Request(`${url}/api/test`, { method: verb, headers: { ...(verb !== "GET" ? { "content-type": "application/json", origin: url } : {}), ...(cookie ? { cookie } : {}), ...headers }, ...(verb !== "GET" ? { body: JSON.stringify(body ?? {}) } : {}) });
}
const call = (f, action, props) => handleAdminRequest(request(action, props), action, f.options);
async function provision(f, username = "test-admin") { const store = f.store(); try { await store.createAdmin(username, testPassword); } finally { store.close(); } }
async function login(f, username = "test-admin") {
  const result = await call(f, "login", { body: { username, password: testPassword } });
  assert.equal(result.status, 200);
  return result.headers.get("set-cookie").split(";")[0];
}
const localPost = id => ({ id, schoolId: "hse", kind: "note", topic: "daily", title: { zh: "A local note", ru: "A local note" }, body: { zh: "This is a local test note, explicitly published.", ru: "This is a local test note, explicitly published." }, cover: null, demo: false, createdAt: "2026-11-16T12:00:00.000Z" });

test("an unconfigured installation has no default account and seeds the canonical catalog once", async t => {
  const f = fixture(t);
  assert.deepEqual(await (await call(f, "session")).json(), { authenticated: false, configured: false });
  const result = await call(f, "featured-read");
  assert.equal(result.headers.get("cache-control"), "no-store");
  const catalog = await result.json();
  assert.equal(catalog.posts.length, 12);
  assert.equal(catalog.featuredIds.length, 9);
  assert.deepEqual(new Set(catalog.featuredIds), new Set(communityEditorialFeaturedIds));
  assert.deepEqual((await (await call(f, "featured-read")).json()).posts, catalog.posts);
});

test("unauthenticated and forged sessions cannot change featured records", async t => {
  const f = fixture(t); await call(f, "featured-read");
  for (const cookie of [undefined, `${SESSION_COOKIE}=${"a".repeat(43)}`, `${SESSION_COOKIE}=admin`, "role=admin; authenticated=true"]) {
    const result = await call(f, "featured-write", { cookie, body: { postId: communityEditorialFeaturedIds[0], featured: false } });
    assert.equal(result.status, 401);
    assert.deepEqual(await result.json(), { error: "unauthorized" });
  }
  assert.equal((await (await call(f, "featured-read")).json()).featuredIds.length, 9);
});

test("login sets a protected opaque cookie and stores only salted password and token hashes", async t => {
  const f = fixture(t); await provision(f);
  const result = await call(f, "login", { body: { username: "TEST-ADMIN", password: testPassword } });
  assert.equal(result.status, 200);
  const header = result.headers.get("set-cookie");
  assert.match(header, /HttpOnly; SameSite=Strict; Max-Age=28800/);
  const cookie = header.split(";")[0];
  const token = cookie.split("=")[1];
  assert.equal(token.length, 43);
  assert.deepEqual(await (await call(f, "session", { cookie })).json(), { authenticated: true, username: "test-admin", configured: true });
  assert.equal((await (await call(f, "session", { cookie: `${cookie}; ${cookie}` })).json()).authenticated, false);
  const db = new DatabaseSync(join(f.dataDir, "studentpath.sqlite"));
  const user = db.prepare("SELECT * FROM admin_users").get();
  const session = db.prepare("SELECT * FROM admin_sessions").get();
  assert.equal(user.salt.length, 64); assert.equal(user.password_hash.length, 128);
  assert.equal(session.token_hash.length, 64); assert.notEqual(session.token_hash, token);
  assert.ok(!JSON.stringify(user).includes(testPassword));
  db.close();
});

test("sessions expire at eight hours and logout revokes server state", async t => {
  const f = fixture(t); await provision(f);
  const cookie = await login(f);
  f.advance(SESSION_SECONDS * 1000);
  assert.equal((await (await call(f, "session", { cookie })).json()).authenticated, false);
  const nextCookie = await login(f);
  const result = await call(f, "logout", { cookie: nextCookie });
  assert.equal(result.status, 200); assert.match(result.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await (await call(f, "session", { cookie: nextCookie })).json()).authenticated, false);
});

test("password reset revokes all sessions and preserves catalog", async t => {
  const f = fixture(t); await provision(f); await call(f, "featured-read");
  const cookie = await login(f); const second = await login(f);
  const store = f.store(); await store.createAdmin("test-admin", changedPassword, { reset: true }); store.close();
  for (const old of [cookie, second]) assert.equal((await (await call(f, "session", { cookie: old })).json()).authenticated, false);
  assert.equal((await call(f, "login", { body: { username: "test-admin", password: testPassword } })).status, 401);
  assert.equal((await call(f, "login", { body: { username: "test-admin", password: changedPassword } })).status, 200);
  assert.equal((await (await call(f, "featured-read")).json()).posts.length, 12);
});

test("login errors are generic and account throttles persist across store connections", async t => {
  const f = fixture(t); await provision(f);
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await call(f, "login", { body: { username: "test-admin", password: "incorrect-password" } });
    assert.equal(result.status, 401); assert.deepEqual(await result.json(), { error: "invalid_credentials" });
  }
  const limited = await call(f, "login", { body: { username: "test-admin", password: testPassword } });
  assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "900");
  const unknown = await call(f, "login", { body: { username: "unknown-user", password: testPassword } });
  assert.deepEqual(await unknown.json(), { error: "invalid_credentials" });
  f.advance(15 * 60 * 1000);
  assert.equal((await call(f, "login", { body: { username: "test-admin", password: testPassword } })).status, 200);
});

test("empty featured selection survives reopening and reseeding", async t => {
  const f = fixture(t); await provision(f); await call(f, "featured-read");
  const cookie = await login(f);
  for (const postId of communityEditorialFeaturedIds) assert.equal((await call(f, "featured-write", { cookie, body: { postId, featured: false } })).status, 200);
  const result = await (await call(f, "featured-read")).json();
  assert.deepEqual(result.featuredIds, []); assert.equal(result.posts.length, 12);
  const updated = communityDemoPosts.map(post => post.id === communityDemoPosts[0].id ? { ...post, title: { zh: "更新后的编辑示例", ru: "Обновлённый редакционный пример" } } : post);
  const changed = await handleAdminRequest(request("featured-read"), "featured-read", { ...f.options, seedPosts: updated });
  const changedCatalog = await changed.json();
  assert.deepEqual(changedCatalog.featuredIds, []);
  assert.deepEqual(changedCatalog.posts.find(post => post.id === updated[0].id), updated[0]);
});

test("global login throttling bounds persisted unknown-account buckets", async t => {
  const f = fixture(t);
  for (let index = 0; index < 60; index++) {
    const result = await call(f, "login", { body: { username: `unknown-${index}`, password: "x".repeat(129) } });
    assert.equal(result.status, 401);
  }
  assert.equal((await call(f, "login", { body: { username: "another-account", password: testPassword } })).status, 429);
  const db = new DatabaseSync(join(f.dataDir, "studentpath.sqlite"));
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM login_attempts").get().count, 61);
  db.close();
});

test("explicit publication persists a shared copy, unfeature retains it, and IDs cannot overwrite it", async t => {
  const f = fixture(t); await provision(f); const cookie = await login(f);
  const post = localPost("post-local-1");
  assert.equal((await call(f, "featured-write", { cookie, body: { postId: post.id, featured: true } })).status, 400);
  const publish = await call(f, "featured-write", { cookie, body: { postId: post.id, featured: true, post } });
  assert.equal(publish.status, 200);
  assert.deepEqual((await publish.json()).posts.find(item => item.id === post.id), post);
  assert.equal((await call(f, "featured-write", { cookie, body: { postId: post.id, featured: true, post: { ...post, schoolId: "rudn" } } })).status, 400);
  assert.equal((await call(f, "featured-write", { cookie, body: { postId: post.id, featured: false } })).status, 200);
  const catalog = await (await call(f, "featured-read")).json();
  assert.ok(catalog.posts.some(item => item.id === post.id)); assert.ok(!catalog.featuredIds.includes(post.id));
  assert.equal((await call(f, "featured-write", { cookie, body: { postId: communityDemoPosts[0].id, featured: true, post: communityDemoPosts[0] } })).status, 400);
});

test("community API normalizes tags and rejects malformed tag payloads without publishing them", async t => {
  const f = fixture(t); await provision(f); const cookie = await login(f);
  const post = { ...localPost("post-tags"), tags: ["＃校园", "# МГУ", "мгу", ""] };
  const result = await call(f, "featured-write", { cookie, body: { postId: post.id, featured: true, post } });
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).posts.find(item => item.id === post.id), { ...post, tags: ["校园", "МГУ"] });
  for (const tags of [null, "校园", [false], ["я".repeat(25)], Array.from({ length: 9 }, (_, n) => `tag-${n}`)]) {
    const invalid = { ...localPost("post-invalid-tags"), tags };
    const response = await call(f, "featured-write", { cookie, body: { postId: invalid.id, featured: true, post: invalid } });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_request" });
  }
  const catalog = await (await call(f, "featured-read")).json();
  assert.deepEqual(catalog.posts.find(item => item.id === post.id).tags, ["校园", "МГУ"]);
  assert.equal(catalog.posts.some(item => item.id === "post-invalid-tags"), false);
});

test("featured selection is capped at seven per school without partial publication", async t => {
  const f = fixture(t); await provision(f); const cookie = await login(f);
  const publish = post => call(f, "featured-write", { cookie, body: { postId: post.id, featured: true, post } });
  const select = (postId, featured = true) => call(f, "featured-write", { cookie, body: { postId, featured } });
  const read = async () => (await call(f, "featured-read")).json();
  const count = (catalog, schoolId) => catalog.posts.filter(post => post.schoolId === schoolId && catalog.featuredIds.includes(post.id)).length;
  assert.equal(COMMUNITY_FEATURED_LIMIT, 7);

  // A published but unselected post must obey the same limit as a new local post.
  const archived = localPost("post-unselected");
  assert.equal((await publish(archived)).status, 200);
  assert.equal((await select(archived.id, false)).status, 200);
  const initial = await read();
  for (let index = count(initial, "hse"); index < COMMUNITY_FEATURED_LIMIT; index++) {
    assert.equal((await publish(localPost(`post-fill-${index}`))).status, 200);
  }
  const full = await read();
  assert.equal(count(full, "hse"), COMMUNITY_FEATURED_LIMIT);
  const existingPick = full.posts.find(post => post.schoolId === "hse" && full.featuredIds.includes(post.id)).id;
  assert.equal((await select(existingPick)).status, 200);
  assert.deepEqual(await read(), full);

  const blockedPost = localPost("post-over-limit");
  for (const rejected of [await select(archived.id), await publish(blockedPost)]) {
    assert.equal(rejected.status, 409);
    assert.deepEqual(await rejected.json(), { error: "featured_limit" });
  }
  assert.deepEqual(await read(), full);
  assert.ok(!full.posts.some(post => post.id === blockedPost.id));

  // Capacity is scoped to a school, and removing a pick frees one slot immediately.
  const otherSchoolPost = { ...localPost("post-other-school"), schoolId: "msu" };
  assert.equal((await publish(otherSchoolPost)).status, 200);
  assert.equal(count(await read(), "hse"), COMMUNITY_FEATURED_LIMIT);
  assert.equal((await select(existingPick, false)).status, 200);
  assert.equal((await publish(blockedPost)).status, 200);
  const restored = await read();
  assert.equal(count(restored, "hse"), COMMUNITY_FEATURED_LIMIT);
  assert.ok(restored.featuredIds.includes(blockedPost.id));
  assert.ok(restored.posts.some(post => post.id === existingPick));
});

test("authorized publication preserves bilingual site images without enabling post edits", async t => {
  const f = fixture(t); await provision(f); await call(f, 'featured-read');
  const cookie = await login(f);
  const post = {
    ...localPost('community-campus-photo-test'), schoolId: 'msu', topic: 'campus',
    title: { zh: '校园里的春天', ru: 'Весна в кампусе' },
    body: { zh: '沿着校园里的小路散步，记录眼前的春日风景。', ru: 'Прогулка по кампусу и фотографии весеннего пейзажа.' },
    author: { zh: 'StudentPath 编辑', ru: 'Редакция StudentPath' },
    images: [{ id: 'campus-photo-1', src: '/media/community/msu/spring.jpg', width: 1200, height: 800, caption: { zh: '校园小路', ru: 'Дорожка кампуса' } }],
    sources: [{ label: { zh: '大学网站', ru: 'Сайт университета' }, url: 'https://www.msu.ru/' }],
  };
  const body = { postId: post.id, featured: true, post };
  assert.equal((await call(f, 'featured-write', { body })).status, 401);
  assert.equal((await call(f, 'featured-write', { cookie, body: { ...body, post: { ...post, images: [{ ...post.images[0], src: '/media/community/../private.jpg' }] } } })).status, 400);
  const result = await call(f, 'featured-write', { cookie, body });
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).posts.find(item => item.id === post.id), post);
  assert.equal((await call(f, 'featured-write', { cookie, body: { ...body, post: { ...post, title: { ...post.title, zh: '不允许借加精修改正文' } } } })).status, 400);
  assert.equal((await call(f, 'featured-write', { cookie, body: { postId: post.id, featured: false } })).status, 200);
  const read = await (await call(f, 'featured-read')).json();
  assert.deepEqual(read.posts.find(item => item.id === post.id), post);
  assert.ok(!read.featuredIds.includes(post.id));
});

test("invalid published records and request shapes cannot partially write", async t => {
  const f = fixture(t); await provision(f); const cookie = await login(f);
  const post = localPost("post-invalid");
  const invalidPosts = [ { ...post, schoolId: "fake" }, { ...post, demo: true }, { ...post, title: { zh: "Hi", ru: "Hi" } }, { ...post, body: { zh: "Too short", ru: "Too short" } }, { ...post, cover: "lilac" }, { ...post, createdAt: "2026-02-31T12:00:00.000Z" }, { ...post, admin: true }, { ...post, id: "demo-forged" }, { ...post, title: { zh: "Title one", ru: "" } } ];
  for (const invalid of invalidPosts) assert.equal((await call(f, "featured-write", { cookie, body: { postId: invalid.id, featured: true, post: invalid } })).status, 400);
  for (const body of [{ postId: post.id, featured: "true" }, { postId: post.id, featured: true, extra: true }, { featured: true }]) assert.equal((await call(f, "featured-write", { cookie, body })).status, 400);
  assert.equal((await (await call(f, "featured-read")).json()).posts.length, 12);
});

test("origin checks reject CSRF, arbitrary hosts, forwarded spoofing and cross-port origins", async t => {
  const f = fixture(t); await provision(f); const cookie = await login(f);
  for (const headers of [{ origin: "https://evil.example" }, { origin: "null" }, { origin: "" }, { origin: "http://127.0.0.1:4000" }, { host: "evil.example" }, { "sec-fetch-site": "cross-site" }]) {
    assert.equal((await call(f, "logout", { cookie, headers })).status, 403);
  }
  assert.equal((await call(f, "session", { url: "http://evil.example", headers: { "x-forwarded-host": "127.0.0.1:3000" } })).status, 403);
  assert.equal((await (await call(f, "session", { cookie })).json()).authenticated, true);
  assert.throws(() => verifyOrigin(request("login", { url: "http://example.com" }), { STUDENTPATH_ORIGIN: "http://example.com" }, true));
  assert.deepEqual(verifyOrigin(request("login", { url: "https://example.com" }), { STUDENTPATH_ORIGIN: "https://example.com" }, true), { secure: true });
  assert.throws(() => verifyOrigin(request("login"), { STUDENTPATH_ORIGIN: "http://localhost:3000" }, true));
  const rewritten = new Request("http://localhost:3000/api/test", { method: "POST", headers: { host: "127.0.0.1:3000", origin } });
  assert.deepEqual(verifyOrigin(rewritten, {}, true), { secure: false });
  assert.throws(() => verifyOrigin(new Request("http://localhost:3000/api/test", { method: "POST", headers: { host: "127.0.0.1:4000", origin: "http://127.0.0.1:4000" } }), {}, true));
  assert.throws(() => verifyOrigin(new Request("http://localhost:3000/api/test", { method: "POST", headers: { host: "evil.example", origin: "http://evil.example" } }), {}, true));
});

test("HTTPS configured origins receive Secure cookies", async t => {
  const f = fixture(t); await provision(f);
  f.options.env.STUDENTPATH_ORIGIN = "https://student.example";
  const result = await call(f, "login", { url: "https://student.example", body: { username: "test-admin", password: testPassword } });
  assert.equal(result.status, 200); assert.match(result.headers.get("set-cookie"), /; Secure$/);
});

test("invalid JSON, excessive bodies, non-JSON media and method mismatch fail safely", async t => {
  const f = fixture(t);
  for (const headers of [{ "content-type": "text/plain" }, { "content-length": "1000000" }]) assert.equal((await call(f, "login", { headers })).status, 400);
  for (const body of ["{broken", JSON.stringify({ username: "a".repeat(2500), password: testPassword })]) {
    const result = await handleAdminRequest(new Request(`${origin}/api/test`, { method: "POST", headers: { origin, "content-type": "application/json" }, body }), "login", f.options);
    assert.equal(result.status, 400); assert.deepEqual(await result.json(), { error: "invalid_request" });
  }
  assert.equal((await handleAdminRequest(new Request(`${origin}/api/test`), "login", f.options)).status, 405);
});

test("database failures return no secrets, paths or writable fallback", async t => {
  const f = fixture(t);
  const blocked = join(f.dataDir, "not-a-directory"); writeFileSync(blocked, "not a database");
  const result = await handleAdminRequest(request("featured-read"), "featured-read", { ...f.options, dataDir: blocked });
  assert.equal(result.status, 503); assert.deepEqual(await result.json(), { error: "unavailable" });
});

test("CLI creates and resets through stdin without accepting password arguments or leaking input", async t => {
  const f = fixture(t);
  async function cli(action, password, args = []) {
    const child = spawn(process.execPath, [resolve("scripts/admin.mjs"), action, "--username", "cli-admin", ...args], { env: { ...process.env, STUDENTPATH_DATA_DIR: f.dataDir }, windowsHide: true });
    let output = ""; child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
    child.stdin.on("error", () => {}); child.stdin.end(`${password}\n`);
    const code = await new Promise(resolve => child.on("close", resolve));
    assert.ok(!output.includes(password));
    return { code, output };
  }
  assert.equal((await cli("create", testPassword, ["--password", testPassword])).code, 1);
  assert.equal((await cli("create", testPassword, ["--password-stdin"])).code, 0);
  const store = f.store(); const login = await store.login("cli-admin", testPassword); store.close();
  assert.equal((await cli("reset", changedPassword, ["--password-stdin"])).code, 0);
  const reopened = f.store(); assert.equal(reopened.session(login.token), null); assert.ok((await reopened.login("cli-admin", changedPassword)).token); reopened.close();
});
