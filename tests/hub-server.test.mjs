import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve, sep } from "node:path";
import ts from "typescript";
import { openAdminStore, SESSION_COOKIE, SESSION_SECONDS } from "../src/lib/server/admin-core.mjs";
import { handleHubRequest, validateHubContent } from "../src/lib/server/hub-http.mjs";
import { handleEditorialCatalog } from "../src/lib/server/editorial-http.mjs";

const compiled = ts.transpileModule(readFileSync(new URL("../src/data/hub-content.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
new Function("exports", compiled)(exports);
const { hubContentDefault } = exports;
const origin = "http://127.0.0.1:3000";

function fixture(t) {
  const dataDir = mkdtempSync(resolve(tmpdir(), "studentpath-hub-test-"));
  let timestamp = Date.parse("2026-11-16T12:00:00Z");
  const options = { dataDir, now: () => timestamp, env: { NODE_ENV: "production" } };
  t.after(() => {
    const target = resolve(dataDir);
    assert.ok(target.startsWith(`${resolve(tmpdir())}${sep}`) && basename(target).startsWith("studentpath-hub-test-"));
    rmSync(target, { recursive: true, force: true });
  });
  return { options, advance: ms => { timestamp += ms; } };
}

function request(method = "GET", { document = hubContentDefault, cookie, headers = {}, body } = {}) {
  return new Request(`${origin}/api/hub`, {
    method,
    headers: { ...(method === "GET" ? {} : { origin, "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...headers },
    ...(method === "GET" ? {} : { body: body ?? JSON.stringify(document) }),
  });
}
const call = (f, method = "GET", args) => handleHubRequest(request(method, args), f.options);
async function login(f) {
  const store = openAdminStore(f.options);
  try {
    await store.createAdmin("hub-test", "Temporary-hub-test-2026!");
    const { token } = await store.login("hub-test", "Temporary-hub-test-2026!");
    return `${SESSION_COOKIE}=${token}`;
  } finally { store.close(); }
}

test("a new dashboard has no override and unsupported methods cannot mutate it", async t => {
  const f = fixture(t);
  const response = await call(f);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { document: null });
  assert.equal(response.headers.get("cache-control"), "no-store");
  const denied = await call(f, "POST");
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get("allow"), "GET, PUT");
});

test("visitors and forged roles cannot change dashboard copy or submit malformed bodies", async t => {
  const f = fixture(t);
  for (const cookie of [undefined, "role=admin", `${SESSION_COOKIE}=${"a".repeat(43)}`]) {
    const response = await call(f, "PUT", { cookie, body: "malformed" });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "unauthorized" });
  }
  assert.deepEqual(await (await call(f)).json(), { document: null });
});

test("administrator welcome and all entry copy persist, with the other language preserved", async t => {
  const f = fixture(t); const cookie = await login(f);
  const document = structuredClone(hubContentDefault);
  document.eyebrow.zh = "新生信息面板";
  document.title.zh = "新的欢迎语";
  document.highlight.zh = "从这里开始";
  document.description.zh = "查看最新的入门信息。";
  for (const entry of document.entries) {
    entry.title.zh = `新的 ${entry.id} 标题`;
    entry.description.zh = `新的 ${entry.id} 说明`;
    entry.action.zh = "打开查看";
  }
  const response = await call(f, "PUT", { cookie, document });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).document, document);
  // A public read opens a separate SQLite connection, proving persistence beyond the save request.
  assert.deepEqual((await (await call(f)).json()).document, document);
  assert.equal(document.title.ru, hubContentDefault.title.ru);
  assert.deepEqual(document.entries.map(entry => entry.action.ru), hubContentDefault.entries.map(entry => entry.action.ru));

  document.eyebrow = { zh: "", ru: "" };
  document.highlight = { zh: "", ru: "" };
  document.description = { zh: "", ru: "" };
  document.entries[0].description = { zh: "", ru: "" };
  assert.equal((await call(f, "PUT", { cookie, document })).status, 200);
  assert.deepEqual((await (await call(f)).json()).document, document);
});

test("dashboard copy stays out of the guide catalog and cannot replace a guide", async t => {
  const f = fixture(t); const cookie = await login(f);
  const store = openAdminStore(f.options);
  const token = cookie.slice(SESSION_COOKIE.length + 1);
  const guide = { id: "essentials", title: { zh: "原通知", ru: "Памятка" }, summary: { zh: "原简介", ru: "Описание" }, author: { name: { zh: "编辑", ru: "Редакция" }, role: { zh: "", ru: "" } }, images: [] };
  store.writeEditorial(token, guide);
  store.close();
  assert.equal((await call(f, "PUT", { cookie })).status, 200);
  const catalog = handleEditorialCatalog(new Request(`${origin}/api/content`), f.options);
  assert.deepEqual(await catalog.json(), { summaries: [{ id: guide.id, title: guide.title, summary: guide.summary, author: guide.author, imageCount: 0 }] });
  const invalid = { ...hubContentDefault, id: "essentials" };
  assert.equal((await call(f, "PUT", { cookie, document: invalid })).status, 400);
  const reopened = openAdminStore(f.options);
  assert.deepEqual(reopened.readEditorial("essentials"), guide);
  reopened.close();
});

test("only supported copy is stored; navigation and personal fields cannot be injected", async t => {
  const f = fixture(t); const cookie = await login(f);
  const extended = structuredClone(hubContentDefault);
  extended.progress = 100;
  extended.entries[0].href = "https://unrelated.example";
  extended.entries[1].done = true;
  const response = await call(f, "PUT", { cookie, document: extended });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).document, hubContentDefault);
  const invalidChanges = [
    d => { d.version = 2; },
    d => { d.entries.reverse(); },
    d => { d.entries.pop(); },
    d => { d.entries[0].id = "unknown"; },
    d => { d.title.zh = " "; },
    d => { d.entries[1].action.ru = ""; },
    d => { d.eyebrow.zh = "x".repeat(121); },
    d => { d.title.ru = "x".repeat(161); },
    d => { d.description.zh = "x".repeat(1001); },
    d => { d.entries[2].action.zh = "x".repeat(81); },
    d => { d.highlight = { zh: "缺少俄语" }; },
    d => { d.description.ru = "bad\0text"; },
  ];
  for (const change of invalidChanges) {
    const invalid = structuredClone(hubContentDefault); change(invalid);
    assert.throws(() => validateHubContent(invalid), /invalid_request/);
    assert.equal((await call(f, "PUT", { cookie, document: invalid })).status, 400);
  }
  assert.equal((await call(f, "PUT", { cookie, body: "{" })).status, 400);
  assert.equal((await call(f, "PUT", { cookie, headers: { "content-length": "32769" } })).status, 400);
  assert.deepEqual((await (await call(f)).json()).document, hubContentDefault);
});

test("cross-origin requests and expired administrator sessions cannot save", async t => {
  const f = fixture(t); const cookie = await login(f);
  assert.equal((await call(f, "PUT", { cookie, headers: { origin: "https://unrelated.example" } })).status, 403);
  assert.equal((await call(f, "PUT", { cookie, headers: { "sec-fetch-site": "cross-site" } })).status, 403);
  f.advance(SESSION_SECONDS * 1000);
  assert.equal((await call(f, "PUT", { cookie })).status, 401);
  assert.deepEqual(await (await call(f)).json(), { document: null });
});
