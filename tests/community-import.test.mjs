import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { importCommunity, parseCommunityImportArguments, readCommunityManifest } from "../scripts/import-community.mjs";

const firstId = "campus-walk-2026";
const secondId = "campus-library-2026";
const localized = (zh, ru) => ({ zh, ru });
const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xf9sAAAAASUVORK5CYII=", "base64");
function post(id = firstId) {
  return {
    id, schoolId: "msu", kind: "note", topic: "campus",
    title: localized("校园散步路线", "Прогулка по кампусу"),
    body: localized("从校园广场开始，记录今天发现的小角落。", "Прогулка начинается на площади кампуса. Здесь собраны небольшие открытия."),
    cover: null, demo: false, createdAt: "2026-11-17T09:00:00.000Z",
    author: localized("校园编辑", "Редакция кампуса"),
    images: [{ id: "campus-photo", src: "/media/community/test/photo.png", width: 1, height: 1, caption: localized("校园照片", "Фотография кампуса"), credit: { name: "Fixture photographer", url: "https://example.com/photo", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" } }],
    sources: [{ label: localized("校园信息", "Информация о кампусе"), url: "https://example.com/campus" }],
  };
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "studentpath-community-import-test-"));
  const dataDir = join(root, "data"), publicDir = join(root, "public"), manifestPath = join(root, "manifest.json");
  const filename = join(dataDir, "studentpath.sqlite");
  const asset = (name, bytes = pixel) => {
    const path = join(publicDir, "media/community/test", name);
    mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes);
  };
  asset("photo.png");
  t.after(() => {
    const target = resolve(root);
    assert.ok(target.startsWith(`${resolve(tmpdir())}${sep}`) && basename(target).startsWith("studentpath-community-import-test-"));
    rmSync(target, { recursive: true, force: true });
  });
  return {
    options: { manifestPath, dataDir, publicDir }, dataDir, filename, asset,
    write: posts => writeFileSync(manifestPath, JSON.stringify(posts), "utf8"),
    init: () => {
      mkdirSync(dataDir, { recursive: true });
      const db = new DatabaseSync(filename);
      db.exec("CREATE TABLE community_posts(id TEXT PRIMARY KEY,payload TEXT NOT NULL,is_demo INTEGER NOT NULL CHECK(is_demo IN(0,1)),created_at INTEGER NOT NULL); CREATE TABLE community_featured(post_id TEXT PRIMARY KEY REFERENCES community_posts(id),selected_at INTEGER NOT NULL); CREATE TABLE app_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);");
      return db;
    },
    read: id => {
      const db = new DatabaseSync(filename, { readOnly: true });
      try { return db.prepare("SELECT payload,is_demo,created_at FROM community_posts WHERE id=?").get(id); }
      finally { db.close(); }
    },
    backups: () => existsSync(join(dataDir, "backups")) ? readdirSync(join(dataDir, "backups")) : [],
  };
}

test("default dry-run accepts an array or versioned manifest without creating a database", t => {
  const f = fixture(t);
  for (const manifest of [[post()], { posts: [post()] }, { version: 1, posts: [post()] }]) {
    f.write(manifest);
    const result = importCommunity(f.options);
    assert.equal(result.dryRun, true);
    assert.deepEqual(result.pendingIds, [firstId]);
    assert.deepEqual(result.insertedIds, []);
    assert.equal(result.backupPath, null);
    assert.equal(existsSync(f.dataDir), false);
  }
});

test("apply creates only the post table and preserves bilingual text, image metadata, credits and authored date", t => {
  const f = fixture(t); const original = post(); f.write([original]);
  const result = importCommunity({ ...f.options, apply: true });
  assert.deepEqual(result.insertedIds, [firstId]);
  assert.deepEqual(JSON.parse(f.read(firstId).payload), original);
  assert.equal(f.read(firstId).created_at, Date.parse(original.createdAt));
  assert.equal(f.read(firstId).is_demo, 0);
  assert.equal(f.backups().length, 1);
  for (const [filename, expected] of [[result.backupPath, []], [f.filename, ["community_posts"]]]) {
    const db = new DatabaseSync(filename, { readOnly: true });
    try { assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row => row.name), expected); }
    finally { db.close(); }
  }
});

test("existing database previews do not change rows and repeated identical imports skip without a new backup", t => {
  const f = fixture(t); f.write([post()]); importCommunity({ ...f.options, apply: true });
  const before = f.read(firstId), bytes = readFileSync(f.filename);
  f.write([post(), post(secondId)]);
  const preview = importCommunity(f.options);
  assert.deepEqual(preview.pendingIds, [secondId]);
  assert.deepEqual(preview.skippedIds, [firstId]);
  assert.deepEqual(f.read(firstId), before);
  assert.equal(f.read(secondId), undefined);
  assert.deepEqual(readFileSync(f.filename), bytes);
  f.write([Object.fromEntries(Object.entries(post()).reverse())]);
  const repeated = importCommunity({ ...f.options, apply: true });
  assert.deepEqual(repeated.skippedIds, [firstId]);
  assert.deepEqual(repeated.insertedIds, []);
  assert.equal(repeated.backupPath, null);
  assert.equal(f.backups().length, 1);
});

test("conflicting existing posts are reported and preserved while new posts are inserted without changing featured selections", t => {
  const f = fixture(t); const db = f.init();
  const authored = { ...post(), title: localized("后来编辑的校园路线", "Изменённый маршрут по кампусу"), privateNote: "Preserve existing payload exactly" };
  db.prepare("INSERT INTO community_posts VALUES(?,?,0,?)").run(firstId, JSON.stringify(authored), 123);
  db.prepare("INSERT INTO community_featured VALUES(?,?)").run(firstId, 456);
  db.prepare("INSERT INTO app_meta VALUES(?,?)").run("fixture", "untouched"); db.close();
  const before = f.read(firstId); f.write([post()]);
  const conflictOnly = importCommunity({ ...f.options, apply: true });
  assert.deepEqual(conflictOnly.conflictIds, [firstId]);
  assert.deepEqual(conflictOnly.insertedIds, []);
  assert.equal(conflictOnly.backupPath, null);
  f.write([post(), post(secondId)]);
  const result = importCommunity({ ...f.options, apply: true });
  assert.deepEqual(result.conflictIds, [firstId]);
  assert.deepEqual(result.insertedIds, [secondId]);
  assert.deepEqual(f.read(firstId), before);
  for (const path of [result.backupPath, f.filename]) {
    const check = new DatabaseSync(path, { readOnly: true });
    try {
      assert.deepEqual(check.prepare("SELECT * FROM community_featured").all().map(row => ({ ...row })), [{ post_id: firstId, selected_at: 456 }]);
      assert.deepEqual(check.prepare("SELECT * FROM app_meta").all().map(row => ({ ...row })), [{ key: "fixture", value: "untouched" }]);
      assert.deepEqual(check.prepare("SELECT payload,is_demo,created_at FROM community_posts WHERE id=?").get(firstId), before);
    } finally { check.close(); }
  }
});

test("all posts and local image files are validated before any database writes", t => {
  const f = fixture(t);
  const imagePost = changes => ({ ...post(secondId), images: [{ ...post(secondId).images[0], ...changes }] });
  f.asset("disguised.jpg"); f.asset("unreadable.png", Buffer.from("not an image"));
  const invalidManifests = [
    { version: 2, posts: [post()] }, { documents: [post()] }, [post(), post()],
    [post(), { ...post(secondId), body: localized("太短", "Коротко") }],
    [post(), imagePost({ src: "/media/community/test/missing.png" })],
    [post(), imagePost({ width: 2 })],
    [post(), imagePost({ width: 3201 })],
    [post(), imagePost({ src: "/media/community/test/disguised.jpg" })],
    [post(), imagePost({ src: "/media/community/test/unreadable.png" })],
    [post(), imagePost({ src: "/media/community/../outside.png" })],
  ];
  for (const manifest of invalidManifests) {
    f.write(manifest);
    assert.throws(() => importCommunity({ ...f.options, apply: true }));
    assert.equal(existsSync(f.dataDir), false);
  }
  f.write([post()]); importCommunity({ ...f.options, apply: true });
  const before = f.read(firstId);
  f.write([post(secondId), imagePost({ src: "/media/community/test/missing.png" })]);
  assert.throws(() => importCommunity({ ...f.options, apply: true }));
  assert.deepEqual(f.read(firstId), before);
  assert.equal(f.read(secondId), undefined);
  assert.equal(f.backups().length, 1);
});

test("a failed write rolls back all inserted posts in the same batch", t => {
  const f = fixture(t); const db = f.init();
  db.exec(`CREATE TRIGGER reject_test_post BEFORE INSERT ON community_posts WHEN NEW.id='${secondId}' BEGIN SELECT RAISE(ABORT,'fixture write failure'); END;`); db.close();
  f.write([post(), post(secondId)]);
  assert.throws(() => importCommunity({ ...f.options, apply: true }), /fixture write failure/);
  assert.equal(f.read(firstId), undefined);
  assert.equal(f.read(secondId), undefined);
  assert.equal(f.backups().length, 1);
});

test("the pre-import SQLite backup includes committed WAL rows", t => {
  const f = fixture(t); const live = f.init(); f.write([post()]);
  try {
    live.exec("PRAGMA journal_mode=WAL;");
    live.prepare("INSERT INTO app_meta VALUES(?,?)").run("recent", "committed in WAL");
    assert.ok(existsSync(`${f.filename}-wal`));
    const result = importCommunity({ ...f.options, apply: true });
    const backup = new DatabaseSync(result.backupPath, { readOnly: true });
    try {
      assert.equal(backup.prepare("SELECT value FROM app_meta WHERE key='recent'").get().value, "committed in WAL");
      assert.equal(backup.prepare("SELECT id FROM community_posts WHERE id=?").get(firstId), undefined);
    } finally { backup.close(); }
  } finally { live.close(); }
});

test("a backup failure aborts before inserting a post", t => {
  const f = fixture(t); const db = f.init(); db.close(); f.write([post()]);
  writeFileSync(join(f.dataDir, "backups"), "Block the backup directory for this isolated test.");
  assert.throws(() => importCommunity({ ...f.options, apply: true }));
  assert.equal(f.read(firstId), undefined);
});

test("CLI requires a manifest, defaults to preview and rejects conflicting or unsupported options", () => {
  assert.deepEqual(parseCommunityImportArguments(["posts.json"]), { manifestPath: "posts.json" });
  assert.deepEqual(parseCommunityImportArguments(["posts.json", "--dry-run", "--data-dir", "isolated"]), { manifestPath: "posts.json", apply: false, dataDir: "isolated" });
  assert.deepEqual(parseCommunityImportArguments(["--apply", "posts.json"]), { apply: true, manifestPath: "posts.json" });
  for (const args of [[], ["--apply"], ["posts.json", "--data-dir"], ["posts.json", "--force"], ["posts.json", "other.json"], ["posts.json", "--apply", "--dry-run"], ["posts.json", "--apply", "--apply"]]) assert.throws(() => parseCommunityImportArguments(args), /Usage/);
});

test("legacy text-only posts remain valid without adding an image array", t => {
  const f = fixture(t); const original = post(); delete original.images; delete original.author; delete original.sources;
  f.write([original]);
  assert.deepEqual(readCommunityManifest(f.options.manifestPath, f.options), [original]);
});
