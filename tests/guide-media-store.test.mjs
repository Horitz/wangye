import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
function loadStore(globals = {}) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} }; cache.set(filename, compiledModule);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = name => name === "react" ? { useCallback: fn => fn, useSyncExternalStore: (subscribe, snapshot) => { subscribe(() => {}); return snapshot(); } } : load(resolve(root, "src", name.endsWith(".mjs") ? name.slice(2) : `${name.slice(2)}.ts`));
    new Function("require", "module", "exports", ...Object.keys(globals), code)(require, compiledModule, compiledModule.exports, ...Object.values(globals));
    return compiledModule.exports;
  }
  return load(resolve(root, "src/lib/guide-media-store.ts"));
}
function jpeg(width = 800, height = 600) {
  const bytes = Uint8Array.from([255, 216, 255, 192, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0, 255, 217]);
  return { bytes, src: `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}` };
}
const picture = (id = "photo-one", caption = "说明 / подпись") => ({ id, src: jpeg().src, width: 800, height: 600, caption });
function backend(entries = {}) {
  const records = new Map(Object.entries(entries));
  const writes = [];
  return { records, writes, async read(id) { return records.get(id); }, async write(id, value) { writes.push(id); records.set(id, structuredClone(value)); } };
}

test("each guide persists its own custom gallery without touching another guide", async () => {
  const store = loadStore(); const db = backend(); const repo = store.createGuideMediaRepository(db);
  await repo.load("visa-extension");
  assert.equal(repo.getSnapshot("visa-extension").hydrated, true);
  assert.equal(await repo.save("visa-extension", [picture()]), "saved");
  assert.equal(await repo.save("university-admission", [picture("admission", "入学图片")]), "saved");
  const fresh = store.createGuideMediaRepository(db);
  await fresh.load("visa-extension"); await fresh.load("university-admission");
  assert.equal(fresh.getSnapshot("visa-extension").images[0].caption, "说明 / подпись");
  assert.equal(fresh.getSnapshot("university-admission").images[0].caption, "入学图片");
  assert.deepEqual(db.writes, ["visa-extension", "university-admission"]);
});

test("material galleries persist by stable step ID without replacing the existing v1 cover", async () => {
  const store = loadStore();
  const cover = { version: 1, images: [picture("cover", "原有封面")] };
  const db = backend({ "university-admission": cover });
  const repo = store.createGuideMediaRepository(db);
  const first = store.getGuideStepMediaKey("university-admission", "university-admission-find-programme");
  const second = store.getGuideStepMediaKey("university-admission", "university-admission-review-admission-notice");
  const otherGuide = store.getGuideStepMediaKey("visa-extension", "visa-extension-confirm-process");
  assert.equal(await repo.save(first, [picture("first", "学校官网参考图")]), "saved");
  assert.equal(await repo.save(second, [picture("second", "Пример списка")]), "saved");
  assert.equal(await repo.save(otherGuide, [picture("other")]), "saved");
  const fresh = store.createGuideMediaRepository(db);
  await Promise.all(["university-admission", second, first, otherGuide].map(key => fresh.load(key)));
  assert.equal(fresh.getSnapshot(first).images[0].caption, "学校官网参考图");
  assert.equal(fresh.getSnapshot(second).images[0].caption, "Пример списка");
  assert.deepEqual(fresh.getSnapshot("university-admission").images, cover.images);
  assert.equal(await fresh.save(first, []), "saved");
  assert.deepEqual(db.records.get(first), { version: 1, images: [] });
  assert.deepEqual(db.records.get("university-admission"), cover);
  assert.equal(db.records.get(second).images[0].id, "second");
  assert.equal(db.records.get(otherGuide).images[0].id, "other");
});

test("unknown, mismatched and display-based step scopes cannot read or overwrite stored galleries", async () => {
  const store = loadStore(); const db = backend(); let reads = 0;
  db.read = async () => { reads++; };
  const repo = store.createGuideMediaRepository(db);
  for (const [guideId, stepId] of [
    ["unknown-guide", "unknown-guide-confirm"],
    ["visa-extension", "university-admission-find-programme"],
    ["visa-extension", "0"],
    ["visa-extension", "确认安排"],
    ["visa-extension", "visa-extension-no-such-step"],
    ["../visa-extension", "visa-extension-confirm-process"],
  ]) {
    assert.throws(() => store.getGuideStepMediaKey(guideId, stepId), /invalid-guide-step/);
    const key = `step:${guideId}:${stepId}`;
    await repo.load(key);
    assert.equal(await repo.save(key, [picture()]), "invalid");
  }
  assert.equal(reads, 0);
  assert.deepEqual(db.writes, []);
});

test("a corrupt step gallery falls back in memory without poisoning other materials or cover data", async () => {
  const store = loadStore();
  const badKey = store.getGuideStepMediaKey("visa-extension", "visa-extension-prepare-documents");
  const goodKey = store.getGuideStepMediaKey("visa-extension", "visa-extension-confirm-process");
  const corrupt = { version: 8, images: ["unreadable"] };
  const cover = { version: 1, images: [picture("cover")] };
  const db = backend({ "visa-extension": cover, [badKey]: corrupt });
  const repo = store.createGuideMediaRepository(db);
  assert.equal(await repo.save(badKey, [picture("temporary")]), "memory");
  assert.equal(await repo.save(goodKey, [picture("saved")]), "saved");
  assert.equal(repo.getSnapshot(badKey).storageUnavailable, true);
  assert.equal(repo.getSnapshot(goodKey).storageUnavailable, false);
  assert.deepEqual(db.records.get(badKey), corrupt);
  assert.deepEqual(db.records.get("visa-extension"), cover);
  assert.deepEqual(db.writes, [goodKey]);
});

test("replace, remove and restore persist without manufacturing progress or rewriting user captions", async () => {
  const store = loadStore(); const db = backend(); const repo = store.createGuideMediaRepository(db);
  await repo.save("visa-extension", [picture(), picture("second", "Материалы")]);
  await repo.save("visa-extension", [picture("replacement", "自定义 caption"), picture("second", "Материалы")]);
  assert.deepEqual(repo.getSnapshot("visa-extension").images.map(item => item.id), ["replacement", "second"]);
  await repo.save("visa-extension", [picture("second", "Материалы")]);
  assert.equal(repo.getSnapshot("visa-extension").images[0].caption, "Материалы");
  await repo.save("visa-extension", []);
  assert.deepEqual(db.records.get("visa-extension"), { version: 1, images: [] });
  assert.equal(db.records.size, 1);
});

test("invalid images, captions and duplicate IDs do not replace existing saved images", async () => {
  const store = loadStore(); const db = backend(); const repo = store.createGuideMediaRepository(db);
  await repo.save("visa-extension", [picture()]);
  for (const images of [
    [picture(), picture()],
    Array.from({ length: 25 }, (_, index) => picture(`photo-${index}`)),
    [{ ...picture(), src: "https://example.test/photo.jpg" }],
    [{ ...picture(), src: "data:image/svg+xml;base64,PHN2Zz4=" }],
    [{ ...picture(), caption: "x".repeat(161) }],
    [{ ...picture(), caption: "line\nbreak" }],
    [{ ...picture(), width: 900 }],
    [{ ...picture(), src: jpeg(3201, 1000).src, width: 3201, height: 1000 }],
    [{ ...picture(), src: "data:image/jpeg;base64," + "A".repeat(1_200_000) }],
  ]) assert.equal(await repo.save("visa-extension", images), "invalid");
  assert.equal(await repo.save("../other", [picture()]), "invalid");
  assert.deepEqual(db.records.get("visa-extension").images, [picture()]);
  assert.equal(db.writes.length, 1);
});

test("corrupt incoming records are preserved and new edits clearly use memory fallback", async () => {
  const store = loadStore(); const original = { version: 9, images: ["legacy"] };
  const db = backend({ "visa-extension": original }); const repo = store.createGuideMediaRepository(db);
  await repo.load("visa-extension");
  assert.equal(repo.getSnapshot("visa-extension").storageUnavailable, true);
  assert.equal(await repo.save("visa-extension", [picture()]), "memory");
  assert.deepEqual(db.records.get("visa-extension"), original);
  assert.deepEqual(repo.getSnapshot("visa-extension").images, [picture()]);
  assert.equal(db.writes.length, 0);
});

test("24 high-resolution material images retain order and captions on save and reload", async () => {
  const store = loadStore(); const db = backend(); const repo = store.createGuideMediaRepository(db);
  const images = Array.from({ length: 24 }, (_, index) => ({ ...picture(`document-${index}`, `材料 ${index + 1}`), src: jpeg(2400, 3200).src, width: 2400, height: 3200 }));
  assert.equal(await repo.save("visa-extension", images), "saved");
  const fresh = store.createGuideMediaRepository(db);
  await fresh.load("visa-extension");
  assert.deepEqual(fresh.getSnapshot("visa-extension").images, images);
});

test("database read and write failures retain usable memory state and the last persisted record", async () => {
  const store = loadStore();
  const blocked = store.createGuideMediaRepository({ read: async () => { throw new Error("blocked"); }, write: async () => { throw new Error("must not write"); } });
  assert.equal(await blocked.save("visa-extension", [picture()]), "memory");
  assert.equal(blocked.getSnapshot("visa-extension").images.length, 1);
  const original = { version: 1, images: [picture()] };
  const db = backend({ "visa-extension": original });
  db.write = async () => { throw new Error("quota"); };
  const quota = store.createGuideMediaRepository(db);
  assert.equal(await quota.save("visa-extension", [picture("new")]), "memory");
  assert.deepEqual(db.records.get("visa-extension"), original);
  assert.equal(quota.getSnapshot("visa-extension").images[0].id, "new");
});

test("hydration finishes before an edit, so a slow load cannot erase the new selection", async () => {
  const store = loadStore(); let release;
  const db = backend(); db.read = () => new Promise(resolve => { release = resolve; });
  const repo = store.createGuideMediaRepository(db);
  const pending = repo.save("visa-extension", [picture("latest")]);
  release({ version: 1, images: [picture("older")] });
  assert.equal(await pending, "saved");
  assert.equal(repo.getSnapshot("visa-extension").images[0].id, "latest");
});

test("bad format, oversize files and unsafe dimensions fail before bitmap decode", async () => {
  let decodes = 0;
  const store = loadStore({ createImageBitmap: async () => { decodes++; throw new Error("decode"); } });
  await assert.rejects(store.prepareGuideImage({ type: "image/svg+xml", size: 30 }), /format/);
  await assert.rejects(store.prepareGuideImage({ type: "image/jpeg", size: 6 * 1024 * 1024 }), /file-size/);
  await assert.rejects(store.prepareGuideImage({ type: "image/jpeg", size: 30, arrayBuffer: async () => jpeg(5000, 300).bytes.buffer }), /dimensions/);
  assert.equal(decodes, 0);
});

test("the image is reencoded at a bounded size with aspect ratio preserved and decoder released", async () => {
  let closed = false; let draw;
  const canvas = { width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage: (...args) => { draw = args; } }), toDataURL: type => { assert.equal(type, "image/jpeg"); return jpeg(3200, 1600).src; } };
  const bitmap = { width: 4000, height: 2000, close: () => { closed = true; } };
  const store = loadStore({ createImageBitmap: async () => bitmap, document: { createElement: () => canvas }, crypto: { randomUUID: () => "generated-id" } });
  const result = await store.prepareGuideImage({ type: "image/jpeg", size: 30, arrayBuffer: async () => jpeg(4000, 2000).bytes.buffer });
  assert.equal(result.width, 3200); assert.equal(result.height, 1600);
  assert.equal(result.id, "generated-id"); assert.equal(result.caption, "");
  assert.deepEqual(draw.slice(1), [0, 0, 3200, 1600]);
  assert.equal(closed, true);
});
