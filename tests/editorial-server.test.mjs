import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { openAdminStore, SESSION_COOKIE, SESSION_SECONDS } from "../src/lib/server/admin-core.mjs";
import { GUIDE_SECTION_IDS, handleEditorialRequest, handleEditorialCatalog, handleEditorialCover, handleEditorialCreate } from "../src/lib/server/editorial-http.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiledModule = { exports: {} }; cache.set(filename, compiledModule);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const require = name => load(resolve(dirname(filename), `${name}.ts`));
  new Function("require", "module", "exports", code)(require, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const { getEditorialDefault, editorialIds } = load(resolve(root, "src/data/editorial-content.ts"));
const origin = "http://127.0.0.1:3000";

function fixture(t) {
  const dataDir = mkdtempSync(join(tmpdir(), "studentpath-editorial-test-"));
  let timestamp = Date.parse("2026-11-16T12:00:00.000Z");
  const options = { dataDir, now: () => timestamp, env: { NODE_ENV: "production" } };
  t.after(() => {
    const target = resolve(dataDir);
    assert.ok(target.startsWith(`${resolve(tmpdir())}${sep}`) && basename(target).startsWith("studentpath-editorial-test-"));
    rmSync(target, { recursive: true, force: true });
  });
  return { options, advance: ms => { timestamp += ms; } };
}
function request(method = "GET", { document, cookie, headers = {}, body } = {}) {
  return new Request(`${origin}/api/content/visa-extension`, {
    method, headers: { ...(method === "GET" ? {} : { origin, "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...headers },
    ...(method === "GET" ? {} : { body: body ?? JSON.stringify(document ?? {}) }),
  });
}
const call = (f, method = "GET", args, id = "visa-extension") => handleEditorialRequest(request(method, args), id, getEditorialDefault(id), f.options);
async function login(f) {
  const store = openAdminStore(f.options);
  try {
    await store.createAdmin("editor-test", "Temporary-content-test-47!");
    const { token } = await store.login("editor-test", "Temporary-content-test-47!");
    return `${SESSION_COOKIE}=${token}`;
  } finally { store.close(); }
}
function picture(id, caption) {
  const bytes = Buffer.from([255, 216, 255, 192, 0, 17, 8, 0, 2, 0, 3, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0, 255, 217]);
  return { id, caption, width: 3, height: 2, src: `data:image/jpeg;base64,${bytes.toString("base64")}` };
}

test("public readers receive no override until an administrator saves one; unknown IDs are 404", async t => {
  const f = fixture(t);
  for (const id of editorialIds) {
    const response = await call(f, "GET", undefined, id);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { document: null });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal((await call(f, "GET", undefined, "not-a-guide")).status, 404);
  assert.deepEqual(await handleEditorialCatalog(request(), f.options).json(), { summaries: [] });
});

test("anonymous and forged sessions cannot write, and unauthorized bodies are not parsed", async t => {
  const f = fixture(t);
  for (const cookie of [undefined, "role=admin", `${SESSION_COOKIE}=${"a".repeat(43)}`]) {
    const response = await call(f, "PUT", { cookie, body: "malformed" });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "unauthorized" });
  }
  assert.deepEqual(await (await call(f)).json(), { document: null });
});

test("text, sources, cover and separate step galleries persist for public reads after reopening", async t => {
  const f = fixture(t); const cookie = await login(f);
  const document = structuredClone(getEditorialDefault("visa-extension"));
  document.title = { zh: "新的指南标题", ru: "Новый заголовок" };
  document.summary.zh = "第一段\n第二段";
  document.author = { name: { zh: "编辑组", ru: "Редакция" }, role: { zh: "", ru: "" } };
  document.images = [picture("cover", "封面")];
  document.steps[0].description.zh = "新的说明";
  document.steps[0].materials = [{ zh: "材料 A", ru: "Документ A" }];
  document.steps[0].images = [picture("step-one", "材料的正面"), picture("step-two", "材料的背面")];
  document.steps[1].materials = [];
  document.steps[1].sources = [];
  document.sources = [{ label: { zh: "学校来源", ru: "Источник" }, url: "https://international.msu.ru/after" }];
  const result = await call(f, "PUT", { cookie, document });
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).document, document);
  assert.deepEqual((await (await call(f)).json()).document, document);
  const catalog = await handleEditorialCatalog(request(), f.options).json();
  assert.deepEqual(catalog, { summaries: [{ id: document.id, title: document.title, summary: document.summary, author: document.author, imageCount: 1, coverUrl: `/api/content/${document.id}/cover?v=${f.options.now()}` }] });
  assert.ok(!JSON.stringify(catalog).includes("base64"));
  assert.deepEqual(await (await call(f, "GET", undefined, "essentials")).json(), { document: null });
  document.images = [];
  document.steps[0].images = [];
  assert.equal((await call(f, "PUT", { cookie, document })).status, 200);
  assert.deepEqual((await (await call(f)).json()).document.images, []);
});

test("cover reads serve only the current first JPEG, with replacement and removal reflected in the light catalog", async t => {
  const f = fixture(t); const cookie = await login(f);
  const document = structuredClone(getEditorialDefault("visa-extension"));
  const first = picture("first-cover", "封面一");
  const second = picture("second-cover", "封面二");
  // Different JPEG payloads let the test distinguish first-image selection from a gallery response.
  second.src = `data:image/jpeg;base64,${Buffer.from([255, 216, 255, 192, 0, 1, 255, 217]).toString("base64")}`;
  document.images = [first, second];
  document.steps[0].images = [picture("private-to-detail", "仅详情中的材料图")];
  const cover = (url = `${origin}/api/content/${document.id}/cover`) => handleEditorialCover(new Request(url), document.id, getEditorialDefault(document.id), f.options);
  assert.equal(cover().status, 404);
  assert.equal((await call(f, "PUT", { cookie, document })).status, 200);
  const before = (await handleEditorialCatalog(request(), f.options).json()).summaries[0];
  assert.deepEqual(Object.keys(before).sort(), ["id", "title", "summary", "author", "imageCount", "coverUrl"].sort());
  assert.equal(before.imageCount, 2);
  assert.ok(!JSON.stringify(before).includes("base64"));
  assert.ok(!JSON.stringify(before).includes("private-to-detail"));
  let response = cover(new URL(before.coverUrl, origin));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(first.src.slice(23), "base64"));

  f.advance(1);
  document.images.reverse();
  assert.equal((await call(f, "PUT", { cookie, document })).status, 200);
  const reordered = (await handleEditorialCatalog(request(), f.options).json()).summaries[0];
  assert.notEqual(reordered.coverUrl, before.coverUrl);
  response = cover(new URL(reordered.coverUrl, origin));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(second.src.slice(23), "base64"));
  // Even an older URL cannot serve a stale image after a save.
  assert.deepEqual(Buffer.from(await cover(new URL(before.coverUrl, origin)).arrayBuffer()), Buffer.from(second.src.slice(23), "base64"));

  f.advance(1);
  document.images[0] = picture("replacement", "替换后的封面");
  assert.equal((await call(f, "PUT", { cookie, document })).status, 200);
  const replaced = (await handleEditorialCatalog(request(), f.options).json()).summaries[0];
  assert.notEqual(replaced.coverUrl, reordered.coverUrl);
  assert.deepEqual(Buffer.from(await cover().arrayBuffer()), Buffer.from(first.src.slice(23), "base64"));

  document.images = [];
  assert.equal((await call(f, "PUT", { cookie, document })).status, 200);
  assert.equal(cover().status, 404);
  const removed = (await handleEditorialCatalog(request(), f.options).json()).summaries[0];
  assert.equal(removed.imageCount, 0);
  assert.equal(Object.hasOwn(removed, "coverUrl"), false);
  assert.equal((await (await call(f)).json()).document.steps[0].images.length, 1);
});

test("the cover endpoint rejects unknown content, unsupported methods, cross-site reads and non-JPEG stored bytes", async t => {
  const f = fixture(t); const cookie = await login(f);
  const id = "visa-extension";
  const defaults = getEditorialDefault(id);
  const url = `${origin}/api/content/${id}/cover`;
  assert.equal(handleEditorialCover(new Request(url), "unknown", undefined, f.options).status, 404);
  assert.equal(handleEditorialCover(new Request(url), "dashboard", undefined, f.options).status, 404);
  const denied = handleEditorialCover(new Request(url, { method: "POST" }), id, defaults, f.options);
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get("allow"), "GET");
  assert.equal(handleEditorialCover(new Request(url, { headers: { "sec-fetch-site": "cross-site" } }), id, defaults, f.options).status, 403);
  const store = openAdminStore(f.options);
  try {
    for (const src of ["data:image/svg+xml;base64,PHN2Zy8+", "data:image/jpeg;base64,PHN2Zy8+"]) {
      store.writeEditorial(cookie.slice(SESSION_COOKIE.length + 1), { ...defaults, images: [{ ...picture("unsafe-cover", ""), src }] });
      const result = handleEditorialCover(new Request(url), id, defaults, f.options);
      assert.equal(result.status, 400);
      assert.equal(result.headers.get("content-type"), "application/json");
    }
  } finally { store.close(); }
});

test("all canonical documents can be saved, including the editable essentials content", async t => {
  const f = fixture(t); const cookie = await login(f);
  for (const id of editorialIds) {
    const document = structuredClone(getEditorialDefault(id));
    const response = await call(f, "PUT", { cookie, document }, id);
    assert.equal(response.status, 200, id);
    assert.deepEqual((await (await call(f, "GET", undefined, id)).json()).document, document);
  }
  assert.equal((await handleEditorialCatalog(request(), f.options).json()).summaries.length, editorialIds.length);
});

test("large material galleries save through HTTP and stay out of the lightweight catalog", async t => {
  const f = fixture(t); const cookie = await login(f);
  const document = structuredClone(getEditorialDefault("visa-extension"));
  const base = Buffer.from(picture("base", "").src.slice(23), "base64");
  base.writeUInt16BE(3200, 7); base.writeUInt16BE(2400, 9);
  const comment = Buffer.concat([Buffer.from([255, 254, 234, 98]), Buffer.alloc(60000, 32)]);
  const bytes = Buffer.concat([base.subarray(0, 2), ...Array(6).fill(comment), base.subarray(2)]);
  const image = { id: "material-1", caption: "材料全图", width: 2400, height: 3200, src: `data:image/jpeg;base64,${bytes.toString("base64")}` };
  document.steps[0].images = Array.from({ length: 24 }, (_, index) => ({ ...image, id: `material-${index}` }));
  assert.ok(Buffer.byteLength(JSON.stringify(document)) > 8 * 1024 * 1024);
  assert.equal((await call(f, "PUT", { cookie, document })).status, 200);
  const saved = (await (await call(f)).json()).document;
  assert.deepEqual(saved.steps[0].images, document.steps[0].images);
  const catalog = await handleEditorialCatalog(request(), f.options).json();
  assert.ok(!JSON.stringify(catalog).includes("base64"));
  for (const invalid of [
    { ...document, images: Array.from({ length: 25 }, (_, index) => ({ ...image, id: `cover-${index}` })) },
    { ...document, images: [{ ...image, src: `data:image/jpeg;base64,${Buffer.concat([base.subarray(0, 2), ...Array(16).fill(comment), base.subarray(2)]).toString("base64")}` }] },
  ]) {
    assert.equal((await call(f, "PUT", { cookie, document: invalid })).status, 400);
    assert.deepEqual((await (await call(f)).json()).document.steps[0].images, saved.steps[0].images);
  }
});

test("published materials, locations and requirements are editable per step and language; old documents remain compatible", async t => {
  const f = fixture(t); const cookie = await login(f);
  const document = structuredClone(getEditorialDefault("essentials"));
  assert.equal((await call(f, "PUT", { cookie, document }, "essentials")).status, 200);
  const legacy = (await (await call(f, "GET", undefined, "essentials")).json()).document;
  assert.equal(Object.hasOwn(legacy.steps[0], "place"), false);
  assert.equal(Object.hasOwn(legacy.steps[0], "address"), false);
  assert.equal(Object.hasOwn(legacy.steps[0], "requirements"), false);

  document.steps[0].place = { zh: "测试接待处", ru: "Тестовая приёмная" };
  document.steps[0].address = { zh: "测试地址，二层 201 室", ru: "Тестовый адрес, этаж 2, кабинет 201" };
  document.steps[0].requirements = { zh: "测试要求第一条\n测试要求第二条", ru: "Тестовое условие 1\nТестовое условие 2" };
  document.steps[0].materials = [{ zh: "测试材料", ru: "Тестовый документ" }];
  document.steps[0].images = [picture("notice-material", "测试材料正面")];
  document.steps[1].place = { zh: "第二个测试地点", ru: "Второе тестовое место" };
  const saved = await call(f, "PUT", { cookie, document }, "essentials");
  assert.equal(saved.status, 200);
  assert.deepEqual((await saved.json()).document, document);
  assert.deepEqual((await (await call(f, "GET", undefined, "essentials")).json()).document, document);
  assert.deepEqual(await (await call(f)).json(), { document: null });

  document.steps[0].address.zh = "";
  document.steps[0].requirements = { zh: "", ru: "" };
  assert.equal((await call(f, "PUT", { cookie, document }, "essentials")).status, 200);
  assert.deepEqual((await (await call(f, "GET", undefined, "essentials")).json()).document, document);
});

test("optional author text and unnamed sources can be cleared without changing other-language content", async t => {
  const f = fixture(t); const cookie = await login(f);
  const document = structuredClone(getEditorialDefault("visa-extension"));
  document.author = { name: { zh: "", ru: "" }, role: { zh: "", ru: "" } };
  document.summary.zh = "";
  document.sources = [{ label: { zh: "", ru: "" }, url: "https://international.msu.ru/after" }];
  document.steps[0].sources = [{ label: { zh: "材料说明", ru: "" }, url: "https://international.msu.ru/after" }];
  document.steps[0].materials = [];
  assert.equal((await call(f, "PUT", { cookie, document })).status, 200);
  assert.deepEqual((await (await call(f)).json()).document, document);
});

test("invalid content cannot replace a saved document or repoint existing completion identities", async t => {
  const f = fixture(t); const cookie = await login(f);
  const document = structuredClone(getEditorialDefault("visa-extension"));
  await call(f, "PUT", { cookie, document });
  const changes = [
    d => { d.id = "essentials"; },
    d => { d.sectionId = "visa-extension"; },
    d => { d.steps[0].id = "new-step"; },
    d => { d.steps[0].legacyIndex = 2; },
    d => { d.steps.reverse(); },
    d => { d.steps.pop(); },
    d => { d.title.zh = ""; },
    d => { d.steps[0].description.ru = "a".repeat(8001); },
    d => { d.steps[0].place = { zh: "a".repeat(301), ru: "" }; },
    d => { d.steps[0].address = { zh: "", ru: "a".repeat(1001) }; },
    d => { d.steps[0].requirements = { zh: "a".repeat(4001), ru: "" }; },
    d => { d.steps[0].place = null; },
    d => { d.steps[0].address = { zh: "缺少另一种语言" }; },
    d => { d.steps[0].requirements = { zh: "", ru: "bad\0text" }; },
    d => { d.sources[0].url = "javascript:alert(1)"; },
    d => { d.images = [{ ...picture("bad", ""), src: "data:image/svg+xml;base64,PHN2Zy8+" }]; },
    d => { d.images = [picture("duplicate", ""), picture("duplicate", "")]; },
    d => { d.images = [{ ...picture("wide", ""), width: 3201 }]; },
  ];
  for (const change of changes) {
    const invalid = structuredClone(document); change(invalid);
    assert.equal((await call(f, "PUT", { cookie, document: invalid })).status, 400);
    assert.deepEqual((await (await call(f)).json()).document, document);
  }
  assert.equal((await call(f, "PUT", { cookie, body: "{" })).status, 400);
  assert.equal((await call(f, "PUT", { cookie, document, headers: { "content-length": String(33 * 1024 * 1024) } })).status, 400);
});

test("cross-origin requests and expired or revoked sessions cannot save", async t => {
  const f = fixture(t); const cookie = await login(f);
  const document = structuredClone(getEditorialDefault("visa-extension"));
  assert.equal((await call(f, "PUT", { cookie, document, headers: { origin: "https://unrelated.example" } })).status, 403);
  assert.equal((await call(f, "PUT", { cookie, document, headers: { "sec-fetch-site": "cross-site" } })).status, 403);
  f.advance(SESSION_SECONDS * 1000);
  assert.equal((await call(f, "PUT", { cookie, document })).status, 401);
  const store = openAdminStore(f.options);
  const session = await store.login("editor-test", "Temporary-content-test-47!");
  store.logout(session.token); store.close();
  assert.equal((await call(f, "PUT", { cookie: `${SESSION_COOKIE}=${session.token}`, document })).status, 401);
  assert.deepEqual(await (await call(f)).json(), { document: null });
});

function newGuide(sectionId = "visa-extension") {
  const document = structuredClone(getEditorialDefault(sectionId));
  document.id = "new-guide";
  document.sectionId = sectionId;
  document.title = { zh: "分区内的新攻略", ru: "Новая инструкция раздела" };
  document.steps = [{ ...document.steps[0], id: "step-first", legacyIndex: 0 }];
  return document;
}
const create = (f, args) => handleEditorialCreate(request("POST", args), f.options);

test("built-in guides, notices and created guides round-trip normalized tags through detail and catalog APIs", async t => {
  const f = fixture(t); const cookie = await login(f);
  for (const id of ["visa-extension", "essentials", "new-guide"]) {
    const input = id === "new-guide" ? newGuide() : structuredClone(getEditorialDefault(id));
    input.tags = ["＃材料", "# МОСКВА", "москва", ""];
    const written = id === "new-guide" ? await create(f, { cookie, document: input }) : await call(f, "PUT", { cookie, document: input }, id);
    assert.equal(written.status, id === "new-guide" ? 201 : 200);
    const saved = (await written.json()).document;
    assert.deepEqual(saved.tags, ["材料", "МОСКВА"]);
    assert.deepEqual((await (await call(f, "GET", undefined, saved.id)).json()).document, saved);
    const summaries = (await handleEditorialCatalog(request(), f.options).json()).summaries;
    assert.deepEqual(summaries.find(item => item.id === saved.id).tags, saved.tags);
    // An older editor can still change the title without erasing tags; [] is deliberate removal.
    const oldEditor = structuredClone(saved); delete oldEditor.tags; oldEditor.title.zh = "保留标签的新标题";
    assert.equal((await call(f, "PUT", { cookie, document: oldEditor }, saved.id)).status, 200);
    assert.deepEqual((await (await call(f, "GET", undefined, saved.id)).json()).document.tags, saved.tags);
    assert.equal((await call(f, "PUT", { cookie, document: { ...oldEditor, tags: [] } }, saved.id)).status, 200);
    assert.deepEqual((await (await call(f, "GET", undefined, saved.id)).json()).document.tags, []);
    assert.deepEqual((await handleEditorialCatalog(request(), f.options).json()).summaries.find(item => item.id === saved.id).tags, []);
  }
});

test("invalid guide tags reject create and update without changing saved content", async t => {
  const f = fixture(t); const cookie = await login(f);
  const original = { ...structuredClone(getEditorialDefault("visa-extension")), tags: ["保留"] };
  assert.equal((await call(f, "PUT", { cookie, document: original })).status, 200);
  for (const tags of [null, "标签", [24], ["🚀".repeat(25)], Array.from({ length: 9 }, (_, n) => `tag-${n}`)]) {
    for (const result of [await call(f, "PUT", { cookie, document: { ...original, tags } }), await create(f, { cookie, document: { ...newGuide(), tags } })]) {
      assert.equal(result.status, 400);
      assert.deepEqual(await result.json(), { error: "invalid_request" });
    }
    assert.deepEqual((await (await call(f)).json()).document, original);
  }
  assert.equal((await handleEditorialCatalog(request(), f.options).json()).summaries.length, 1);
});

test("administrators create multiple independent guides per section while old document identities remain unchanged", async t => {
  const f = fixture(t); const cookie = await login(f);
  assert.deepEqual(GUIDE_SECTION_IDS, editorialIds.filter(id => id !== "essentials"));
  const oldDocument = structuredClone(getEditorialDefault("visa-extension"));
  oldDocument.title.zh = "保留的原攻略";
  assert.equal((await call(f, "PUT", { cookie, document: oldDocument })).status, 200);
  const created = [];
  for (const sectionId of [...GUIDE_SECTION_IDS, "visa-extension"]) {
    const draft = newGuide(sectionId);
    draft.images = [picture("new-cover", "攻略封面"), picture("another-cover", "第二张")];
    draft.steps[0].images = [picture("material-only", "材料照片")];
    const result = await create(f, { cookie, document: draft });
    assert.equal(result.status, 201);
    const { document } = await result.json();
    assert.match(document.id, /^guide-[0-9a-f-]{36}$/);
    assert.equal(result.headers.get("location"), `/api/content/${document.id}`);
    assert.deepEqual(document, { ...draft, id: document.id });
    assert.deepEqual((await (await call(f, "GET", undefined, document.id)).json()).document, document);
    const cover = handleEditorialCover(new Request(`${origin}/api/content/${document.id}/cover`), document.id, undefined, f.options);
    assert.equal(cover.status, 200);
    assert.deepEqual(Buffer.from(await cover.arrayBuffer()), Buffer.from(draft.images[0].src.slice(23), "base64"));
    created.push(document);
  }
  assert.equal(new Set(created.map(document => document.id)).size, created.length);
  assert.deepEqual((await (await call(f)).json()).document, oldDocument);
  const { summaries } = await handleEditorialCatalog(request(), f.options).json();
  assert.equal(summaries.length, created.length + 1);
  for (const document of created) {
    const summary = summaries.find(item => item.id === document.id);
    assert.equal(summary.sectionId, document.sectionId);
    assert.equal(summary.imageCount, 2);
    assert.equal(summary.coverUrl, `/api/content/${document.id}/cover?v=${f.options.now()}`);
    assert.deepEqual(Object.keys(summary).sort(), ["id", "sectionId", "title", "summary", "author", "imageCount", "coverUrl"].sort());
  }
  assert.ok(!JSON.stringify(summaries).includes("base64"));
  assert.ok(!JSON.stringify(summaries).includes("material-only"));
  assert.equal(Object.hasOwn(summaries.find(item => item.id === oldDocument.id), "sectionId"), false);
});

test("dynamic guides allow one to twenty stable steps and reordering without changing section or article identity", async t => {
  const f = fixture(t); const cookie = await login(f);
  const created = await create(f, { cookie, document: newGuide() });
  const { document } = await created.json();
  document.steps = Array.from({ length: 20 }, (_, index) => ({ ...structuredClone(document.steps[0]), id: `step-${index}`, legacyIndex: 0 }));
  assert.equal((await call(f, "PUT", { cookie, document }, document.id)).status, 200);
  document.steps.reverse();
  assert.equal((await call(f, "PUT", { cookie, document }, document.id)).status, 200);
  assert.deepEqual((await (await call(f, "GET", undefined, document.id)).json()).document.steps.map(step => step.id), document.steps.map(step => step.id));
  document.steps = [document.steps[4]];
  document.steps[0].place = { zh: "已保存地点", ru: "Сохранённое место" };
  document.steps[0].images = [picture("material", "独立材料")];
  assert.equal((await call(f, "PUT", { cookie, document }, document.id)).status, 200);
  const mutations = [
    draft => { draft.id = "visa-extension"; },
    draft => { draft.sectionId = "first-week"; },
    draft => { delete draft.sectionId; },
    draft => { draft.steps = []; },
    draft => { draft.steps = Array.from({ length: 21 }, (_, index) => ({ ...draft.steps[0], id: `step-${index}` })); },
    draft => { draft.steps.push(structuredClone(draft.steps[0])); },
    draft => { draft.steps[0].id = "bad/step"; },
    draft => { draft.steps[0].legacyIndex = 1; },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(document); mutate(invalid);
    assert.equal((await call(f, "PUT", { cookie, document: invalid }, document.id)).status, 400);
    assert.deepEqual((await (await call(f, "GET", undefined, document.id)).json()).document, document);
  }
  assert.deepEqual(await (await call(f)).json(), { document: null });
});

test("creating a guide requires a real live session and same-origin request before parsing the body", async t => {
  const f = fixture(t);
  for (const cookie of [undefined, "role=admin", `${SESSION_COOKIE}=${"a".repeat(43)}`]) {
    const result = await create(f, { cookie, body: "malformed" });
    assert.equal(result.status, 401);
  }
  const cookie = await login(f);
  const document = newGuide();
  assert.equal((await create(f, { cookie, document, headers: { origin: "https://unrelated.example" } })).status, 403);
  assert.equal((await create(f, { cookie, document, headers: { origin: "" } })).status, 403);
  assert.equal((await create(f, { cookie, document, headers: { "sec-fetch-site": "cross-site" } })).status, 403);
  f.advance(SESSION_SECONDS * 1000);
  assert.equal((await create(f, { cookie, document })).status, 401);
  const store = openAdminStore(f.options);
  const session = await store.login("editor-test", "Temporary-content-test-47!");
  store.logout(session.token); store.close();
  assert.equal((await create(f, { cookie: `${SESSION_COOKIE}=${session.token}`, document })).status, 401);
  assert.deepEqual(await handleEditorialCatalog(request(), f.options).json(), { summaries: [] });
});

test("creation rejects invalid sections and content without publishing partial records", async t => {
  const f = fixture(t); const cookie = await login(f);
  const changes = [
    draft => { draft.id = "visa-extension"; },
    draft => { draft.id = "guide-5d995c17-1b25-4bd1-b923-9668a76c9456"; },
    draft => { draft.sectionId = "documents"; },
    draft => { draft.sectionId = "essentials"; },
    draft => { draft.sectionId = "dashboard"; },
    draft => { delete draft.sectionId; },
    draft => { draft.title.ru = ""; },
    draft => { draft.title = { zh: "缺少俄文" }; },
    draft => { draft.steps = []; },
    draft => { draft.steps[0].legacyIndex = 1; },
    draft => { draft.steps.push(structuredClone(draft.steps[0])); },
    draft => { draft.steps[0].description.zh = "a".repeat(8001); },
    draft => { draft.steps[0].address = { zh: "a".repeat(1001), ru: "" }; },
    draft => { draft.sources = [{ label: { zh: "", ru: "" }, url: "javascript:alert(1)" }]; },
    draft => { draft.images = [{ ...picture("bad-image", ""), src: "data:image/svg+xml;base64,PHN2Zy8+" }]; },
  ];
  for (const change of changes) {
    const document = newGuide(); change(document);
    assert.equal((await create(f, { cookie, document })).status, 400);
  }
  assert.equal((await create(f, { cookie, body: "{" })).status, 400);
  assert.equal((await create(f, { cookie, document: newGuide(), headers: { "content-length": String(33 * 1024 * 1024) } })).status, 400);
  assert.deepEqual(await handleEditorialCatalog(request(), f.options).json(), { summaries: [] });
});

test("dynamic HTTP endpoints do not expose reserved documents or create unknown IDs through PUT", async t => {
  const f = fixture(t); const cookie = await login(f);
  const draft = newGuide();
  const unknownId = "guide-5d995c17-1b25-4bd1-b923-9668a76c9456";
  draft.id = unknownId;
  assert.equal((await call(f, "PUT", { cookie, document: draft }, unknownId)).status, 404);
  const store = openAdminStore(f.options);
  store.writeEditorial(cookie.slice(SESSION_COOKIE.length + 1), { id: "dashboard", version: 1, title: { zh: "首页", ru: "Главная" } });
  store.close();
  for (const id of [unknownId, "dashboard", "new-guide", "not-a-guide"]) {
    assert.equal((await call(f, "GET", undefined, id)).status, 404);
    assert.equal(handleEditorialCover(new Request(`${origin}/api/content/${id}/cover`), id, undefined, f.options).status, 404);
  }
  const unsupported = await handleEditorialCreate(request(), f.options);
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.get("allow"), "POST");
  assert.equal((await call(f, "DELETE", { cookie, document: draft }, unknownId)).status, 405);
  assert.deepEqual(await handleEditorialCatalog(request(), f.options).json(), { summaries: [] });
});
