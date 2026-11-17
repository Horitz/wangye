import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deflateSync } from "node:zlib";
import ts from "typescript";

const filename = new URL("../src/lib/personal-identity-store.ts", import.meta.url);
function loadStore(browser, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  const require = name => {
    assert.equal(name, "react");
    return { useSyncExternalStore: (subscribe, snapshot) => { subscribe(() => {}); return snapshot(); } };
  };
  const names = Object.keys(globals);
  new Function("require", "module", "exports", "window", ...names, compiled)(require, compiledModule, compiledModule.exports, browser, ...Object.values(globals));
  return compiledModule.exports;
}
function memoryStorage(entries = {}) {
  const data = new Map(Object.entries(entries));
  const writes = [];
  return { data, writes, getItem: key => data.get(key) ?? null, setItem: (key, value) => { writes.push(key); data.set(key, value); } };
}
function pngHeader(width = 256, height = 256) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer); view.setUint32(16, width); view.setUint32(20, height);
  return bytes;
}
function pngFixture() {
  function chunk(type, data) {
    const name = Buffer.from(type);
    let crc = 0xffffffff;
    for (const byte of Buffer.concat([name, data])) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, name, data, checksum]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(256, 0); header.writeUInt32BE(256, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from(pngHeader().slice(0, 8)), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.alloc((256 * 4 + 1) * 256))), chunk("IEND", Buffer.alloc(0))]);
}
const presetDraft = { nickname: "小林", preset: "glasses", photo: null };

test("isolated identity records round-trip without reading or writing other project storage", () => {
  const unrelated = { "studentpath:home:v2": "profile untouched", "studentpath:preparation:v1": "dates untouched", "studentpath:community:v2": "posts untouched" };
  const storage = memoryStorage(unrelated);
  const store = loadStore({ localStorage: storage, addEventListener() {} });
  assert.equal(store.savePersonalIdentity({ ...presetDraft, nickname: "  小林  " }), "saved");
  assert.deepEqual(store.usePersonalIdentity(), { ...presetDraft, version: 1, hydrated: true, storageUnavailable: false });
  assert.deepEqual(storage.writes, [store.PERSONAL_IDENTITY_STORAGE_KEY]);
  for (const [key, value] of Object.entries(unrelated)) assert.equal(storage.getItem(key), value);
  const fresh = loadStore({ localStorage: storage, addEventListener() {} });
  assert.equal(fresh.usePersonalIdentity().nickname, "小林");
  assert.equal(fresh.usePersonalIdentity().preset, "glasses");
});

test("empty nickname and all four presets persist, while unsafe or unsupported records fail validation", () => {
  const store = loadStore();
  for (const preset of store.identityPresets) assert.equal(store.parsePersonalIdentity(JSON.stringify({ version: 1, nickname: "", preset, photo: null })).preset, preset);
  for (const patch of [{ nickname: "a".repeat(33) }, { nickname: "line\nbreak" }, { preset: "unknown" }, { photo: "https://example.test/avatar.png" }, { photo: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }, { version: 9 }]) {
    assert.throws(() => store.parsePersonalIdentity(JSON.stringify({ version: 1, ...presetDraft, ...patch })));
  }
});

test("reencoded PNG avatars round-trip while truncated, oversized and differently sized photo records are rejected", () => {
  const store = loadStore();
  const photo = `data:image/png;base64,${pngFixture().toString("base64")}`;
  assert.equal(store.parsePersonalIdentity(JSON.stringify({ version: 1, ...presetDraft, photo })).photo, photo);
  for (const invalid of [photo.slice(0, -8), `data:image/png;base64,${Buffer.from(pngHeader()).toString("base64")}`, `data:image/png;base64,${Buffer.from(pngHeader(4096, 4096)).toString("base64")}`, `data:image/png;base64,${"A".repeat(400_000)}`]) {
    assert.throws(() => store.parsePersonalIdentity(JSON.stringify({ version: 1, ...presetDraft, photo: invalid })));
  }
});

test("corrupt data stays untouched while accepted edits are explicitly memory-only", () => {
  const storage = memoryStorage({ "studentpath:personal-identity:v1": "{broken" });
  const store = loadStore({ localStorage: storage, addEventListener() {} });
  assert.equal(store.usePersonalIdentity().storageUnavailable, true);
  assert.equal(store.savePersonalIdentity(presetDraft), "memory");
  assert.equal(store.usePersonalIdentity().nickname, "小林");
  assert.equal(storage.getItem(store.PERSONAL_IDENTITY_STORAGE_KEY), "{broken");
  assert.deepEqual(storage.writes, []);
});

test("blocked getters and quota failures keep old persisted data and report memory fallback", () => {
  const blocked = loadStore({ get localStorage() { throw new Error("blocked"); }, addEventListener() {} });
  assert.equal(blocked.savePersonalIdentity(presetDraft), "memory");
  assert.equal(blocked.usePersonalIdentity().preset, "glasses");
  const original = JSON.stringify({ version: 1, ...presetDraft });
  const storage = memoryStorage({ "studentpath:personal-identity:v1": original });
  storage.setItem = () => { throw new Error("quota"); };
  const quota = loadStore({ localStorage: storage, addEventListener() {} });
  assert.equal(quota.savePersonalIdentity({ ...presetDraft, nickname: "new", preset: "beanie" }), "memory");
  assert.equal(storage.getItem(quota.PERSONAL_IDENTITY_STORAGE_KEY), original);
  assert.equal(quota.usePersonalIdentity().nickname, "new");
});

test("storage events synchronize this identity only and do not overwrite corrupted incoming records", () => {
  const events = {};
  const storage = memoryStorage();
  const store = loadStore({ localStorage: storage, addEventListener: (name, callback) => { events[name] = callback; } });
  store.usePersonalIdentity();
  storage.setItem(store.PERSONAL_IDENTITY_STORAGE_KEY, JSON.stringify({ version: 1, ...presetDraft }));
  events.storage({ key: "studentpath:home:v2", storageArea: storage });
  assert.equal(store.usePersonalIdentity().nickname, "");
  events.storage({ key: store.PERSONAL_IDENTITY_STORAGE_KEY, storageArea: storage });
  assert.equal(store.usePersonalIdentity().nickname, "小林");
  storage.setItem(store.PERSONAL_IDENTITY_STORAGE_KEY, "bad");
  events.storage({ key: store.PERSONAL_IDENTITY_STORAGE_KEY, storageArea: storage });
  assert.equal(store.usePersonalIdentity().storageUnavailable, true);
  assert.equal(store.usePersonalIdentity().nickname, "小林");
});

test("image header inspection rejects forged formats and excessive dimensions before decoding", () => {
  const store = loadStore();
  assert.deepEqual(store.inspectIdentityImage(pngHeader(400, 300), "image/png"), { width: 400, height: 300 });
  for (const [width, height] of [[0, 200], [5000, 100], [4096, 4096]]) assert.throws(() => store.inspectIdentityImage(pngHeader(width, height), "image/png"), /dimensions/);
  assert.throws(() => store.inspectIdentityImage(new TextEncoder().encode("<svg></svg>"), "image/png"), /format/);
  assert.throws(() => store.inspectIdentityImage(pngHeader(), "image/jpeg"), /format/);
  const jpeg = Uint8Array.from([255, 216, 255, 192, 0, 17, 8, 1, 44, 1, 144, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0]);
  assert.deepEqual(store.inspectIdentityImage(jpeg, "image/jpeg"), { width: 400, height: 300 });
  const webp = new Uint8Array(30);
  webp.set(new TextEncoder().encode("RIFF")); webp.set(new TextEncoder().encode("WEBPVP8X"), 8);
  webp[24] = 143; webp[25] = 1; webp[27] = 43; webp[28] = 1;
  assert.deepEqual(store.inspectIdentityImage(webp, "image/webp"), { width: 400, height: 300 });
});

test("uploads reject excessive files and dimensions before bitmap decoding and reject undecodable pixels", async () => {
  let decoded = 0;
  const store = loadStore(undefined, { createImageBitmap: async () => { decoded++; throw new Error("bad image"); } });
  await assert.rejects(store.prepareIdentityPhoto({ type: "image/svg+xml", size: 20 }), /format/);
  await assert.rejects(store.prepareIdentityPhoto({ type: "image/png", size: store.IDENTITY_FILE_LIMIT + 1 }), /file-size/);
  await assert.rejects(store.prepareIdentityPhoto({ type: "image/png", size: 33, arrayBuffer: async () => pngHeader(6000, 10).buffer }), /dimensions/);
  assert.equal(decoded, 0);
  await assert.rejects(store.prepareIdentityPhoto({ type: "image/png", size: 33, arrayBuffer: async () => pngHeader().buffer }), /decode/);
  assert.equal(decoded, 1);
});

test("successful decoding is center-cropped into a new 256 square PNG and decoder resources close", async () => {
  let closed = false;
  let drawArgs;
  const dataUrl = `data:image/png;base64,${pngFixture().toString("base64")}`;
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: (...args) => { drawArgs = args; } }), toDataURL: type => { assert.equal(type, "image/png"); return dataUrl; } };
  const bitmap = { width: 400, height: 300, close: () => { closed = true; } };
  const store = loadStore(undefined, { createImageBitmap: async () => bitmap, document: { createElement: name => { assert.equal(name, "canvas"); return canvas; } } });
  const result = await store.prepareIdentityPhoto({ type: "image/png", size: 33, arrayBuffer: async () => pngHeader(400, 300).buffer });
  assert.equal(result, dataUrl);
  assert.equal(canvas.width, 256); assert.equal(canvas.height, 256);
  assert.deepEqual(drawArgs.slice(1), [50, 0, 300, 300, 0, 0, 256, 256]);
  assert.equal(closed, true);
});
