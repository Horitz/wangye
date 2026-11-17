import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { importEditorial, parseImportArguments } from "../scripts/import-editorial.mjs";
import { openAdminStore, SESSION_COOKIE } from "../src/lib/server/admin-core.mjs";
import { handleEditorialRequest, handleEditorialCatalog } from "../src/lib/server/editorial-http.mjs";

const firstId = "guide-00000000-0000-4000-8000-000000000001";
const secondId = "guide-00000000-0000-4000-8000-000000000002";
const text = (zh, ru) => ({ zh, ru });
function guide(id = firstId) {
  return {
    version: 1, id, sectionId: "medical-examination",
    title: text("整理后的体检经验", "Опыт прохождения медосмотра"),
    summary: text("来源中的个人经历。", "Личный опыт из источника."),
    author: { name: text("StudentPath", "StudentPath"), role: text("编辑整理", "Редакция") },
    images: [],
    steps: [{ id: "step-00000000-0000-4000-8000-000000000001", legacyIndex: 0, title: text("整理材料", "Подготовить документы"), description: text("带上已经确认的材料。", "Возьмите подтверждённые документы."), materials: [text("材料清单", "Список документов")], place: text("办理地点", "Место оформления"), address: text("示例地址", "Адрес для примера"), requirements: text("预约信息", "Информация о записи"), images: [], sources: [] }],
    sources: [{ label: text("莫大说明", "Информация МГУ"), url: "https://international.msu.ru/after" }],
  };
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "studentpath-import-test-"));
  const dataDir = join(root, "data");
  const manifestPath = join(root, "manifest.json");
  t.after(() => {
    const target = resolve(root);
    assert.ok(target.startsWith(`${resolve(tmpdir())}${sep}`) && basename(target).startsWith("studentpath-import-test-"));
    rmSync(target, { recursive: true, force: true });
  });
  return {
    options: { manifestPath, dataDir }, dataDir,
    write: documents => writeFileSync(manifestPath, JSON.stringify(documents), "utf8"),
    read: id => {
      const db = new DatabaseSync(join(dataDir, "studentpath.sqlite"), { readOnly: true });
      try { return db.prepare("SELECT payload,updated_at FROM editorial_content WHERE id=?").get(id); }
      finally { db.close(); }
    },
    backups: () => existsSync(join(dataDir, "backups")) ? readdirSync(join(dataDir, "backups")) : [],
  };
}

test("valid guides import into the existing public catalog and produce a consistent pre-import backup", async t => {
  const f = fixture(t); const document = guide(); f.write([document, guide(secondId)]);
  const result = importEditorial(f.options);
  assert.deepEqual(result.insertedIds, [firstId, secondId]);
  assert.deepEqual(result.skippedIds, []);
  assert.ok(existsSync(result.backupPath));
  assert.equal(f.backups().length, 1);
  const backup = new DatabaseSync(result.backupPath, { readOnly: true });
  try { assert.equal(backup.prepare("SELECT count(*) AS total FROM editorial_content").get().total, 0); }
  finally { backup.close(); }
  const request = new Request(`http://127.0.0.1:3000/api/content/${firstId}`);
  const response = await handleEditorialRequest(request, firstId, undefined, { dataDir: f.dataDir });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).document, document);
  const catalog = await handleEditorialCatalog(new Request("http://127.0.0.1:3000/api/content"), { dataDir: f.dataDir }).json();
  assert.deepEqual(catalog.summaries.map(item => item.id), [firstId, secondId]);
});

test("repeated imports preserve administrator edits and original timestamps without another backup", async t => {
  const f = fixture(t); const original = guide(); f.write([original]);
  importEditorial(f.options);
  const store = openAdminStore({ dataDir: f.dataDir });
  let token;
  try {
    await store.createAdmin("import-test", "Isolated-import-test-83!");
    ({ token } = await store.login("import-test", "Isolated-import-test-83!"));
  } finally { store.close(); }
  const edited = { ...original, title: text("管理员后来修改的标题", "Заголовок, изменённый редактором"), sources: [] };
  const response = await handleEditorialRequest(new Request(`http://127.0.0.1:3000/api/content/${firstId}`, {
    method: "PUT", headers: { origin: "http://127.0.0.1:3000", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${token}` }, body: JSON.stringify(edited),
  }), firstId, undefined, { dataDir: f.dataDir });
  assert.equal(response.status, 200);
  const before = f.read(firstId);
  const result = importEditorial(f.options);
  assert.deepEqual(result.insertedIds, []);
  assert.deepEqual(result.skippedIds, [firstId]);
  assert.equal(result.backupPath, null);
  assert.deepEqual(f.read(firstId), before);
  assert.deepEqual(JSON.parse(f.read(firstId).payload), edited);
  assert.equal(f.backups().length, 1);

  // A later batch backs up the edited row and committed account data, then adds only the new ID.
  f.write([original, guide(secondId)]);
  const additional = importEditorial(f.options);
  assert.deepEqual(additional.insertedIds, [secondId]);
  assert.deepEqual(additional.skippedIds, [firstId]);
  const backup = new DatabaseSync(additional.backupPath, { readOnly: true });
  try {
    assert.deepEqual(backup.prepare("SELECT payload,updated_at FROM editorial_content WHERE id=?").get(firstId), before);
    assert.equal(backup.prepare("SELECT count(*) AS total FROM admin_users").get().total, 1);
  } finally { backup.close(); }
  assert.deepEqual(f.read(firstId), before);
});

test("dry-run validates and counts new IDs without creating a database or backup", t => {
  const f = fixture(t); f.write([guide()]);
  const result = importEditorial({ ...f.options, dryRun: true });
  assert.deepEqual(result.pendingIds, [firstId]);
  assert.deepEqual(result.insertedIds, []);
  assert.equal(result.backupPath, null);
  assert.equal(existsSync(f.dataDir), false);
  importEditorial(f.options);
  f.write([guide(), guide(secondId)]);
  const before = f.read(firstId);
  const repeated = importEditorial({ ...f.options, dryRun: true });
  assert.deepEqual(repeated.pendingIds, [secondId]);
  assert.deepEqual(repeated.skippedIds, [firstId]);
  assert.deepEqual(f.read(firstId), before);
  assert.equal(f.read(secondId), undefined);
  assert.equal(f.backups().length, 1);
});

test("invalid or duplicate documents reject the whole manifest before any writes", t => {
  const f = fixture(t);
  const badImage = guide(secondId); badImage.images = [{ id: "external", src: "https://example.com/image.jpg", width: 10, height: 10, caption: "" }];
  const noRussian = guide(secondId); noRussian.steps[0].title.ru = "";
  for (const documents of [
    { documents: [guide()] }, [guide(), guide()], [guide(), guide("guide-not-a-uuid")],
    [guide(), { ...guide(secondId), sectionId: "new-section" }], [guide(), badImage], [guide(), noRussian],
  ]) {
    f.write(documents);
    assert.throws(() => importEditorial(f.options));
    assert.equal(existsSync(f.dataDir), false);
  }
  f.write([guide()]); importEditorial(f.options);
  const before = f.read(firstId);
  f.write([guide(secondId), noRussian]);
  assert.throws(() => importEditorial(f.options));
  assert.deepEqual(f.read(firstId), before);
  assert.equal(f.read(secondId), undefined);
  assert.equal(f.backups().length, 1);
});

test("a database write failure rolls back every new article in the batch", t => {
  const f = fixture(t); f.write([guide(), guide(secondId)]);
  const store = openAdminStore({ dataDir: f.dataDir }); store.close();
  const db = new DatabaseSync(join(f.dataDir, "studentpath.sqlite"));
  db.exec(`CREATE TRIGGER import_test_reject BEFORE INSERT ON editorial_content WHEN NEW.id='${secondId}' BEGIN SELECT RAISE(ABORT,'test write failure'); END;`);
  db.close();
  assert.throws(() => importEditorial(f.options), /test write failure/);
  assert.equal(f.read(firstId), undefined);
  assert.equal(f.read(secondId), undefined);
  assert.equal(f.backups().length, 1);
});

test("backup includes committed WAL data while another connection remains open", t => {
  const f = fixture(t); f.write([guide()]);
  const store = openAdminStore({ dataDir: f.dataDir }); store.close();
  const filename = join(f.dataDir, "studentpath.sqlite");
  const live = new DatabaseSync(filename);
  try {
    live.exec("PRAGMA journal_mode=WAL;");
    live.prepare("INSERT INTO editorial_content(id,payload,updated_at) VALUES(?,?,?)").run("dashboard", JSON.stringify({ id: "dashboard", title: "Existing content" }), 123);
    assert.ok(existsSync(`${filename}-wal`));
    const result = importEditorial(f.options);
    const backup = new DatabaseSync(result.backupPath, { readOnly: true });
    try {
      assert.equal(backup.prepare("SELECT updated_at FROM editorial_content WHERE id='dashboard'").get().updated_at, 123);
      assert.equal(backup.prepare("SELECT id FROM editorial_content WHERE id=?").get(firstId), undefined);
    } finally { backup.close(); }
  } finally { live.close(); }
});

test("backup failure aborts before any new guide is inserted", t => {
  const f = fixture(t); f.write([guide()]);
  const store = openAdminStore({ dataDir: f.dataDir }); store.close();
  writeFileSync(join(f.dataDir, "backups"), "Fixture blocks creation of the backup directory.");
  assert.throws(() => importEditorial(f.options));
  assert.equal(f.read(firstId), undefined);
});

test("CLI options accept an optional manifest and data directory and reject unknown flags", () => {
  assert.deepEqual(parseImportArguments([]), {});
  assert.deepEqual(parseImportArguments(["batch.json", "--dry-run", "--data-dir", "data"]), { manifestPath: "batch.json", dryRun: true, dataDir: "data" });
  assert.throws(() => parseImportArguments(["--data-dir"]), /Usage/);
  assert.throws(() => parseImportArguments(["--force"]), /Usage/);
  assert.throws(() => parseImportArguments(["one.json", "two.json"]), /Usage/);
});
