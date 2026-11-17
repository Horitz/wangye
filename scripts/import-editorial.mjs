import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openAdminStore } from "../src/lib/server/admin-core.mjs";
import { validateEditorialDocument } from "../src/lib/server/editorial-http.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export const DEFAULT_MANIFEST = join(projectRoot, "content/imports/xhs-2026-11.json");
const guideIdPattern = /^guide-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Validate the complete batch before opening a database for writing. */
export function readEditorialManifest(manifestPath) {
  const input = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(input)) throw new Error("The manifest must be an array of guide documents.");
  const ids = new Set();
  return input.map((document, index) => {
    if (!guideIdPattern.test(document?.id)) throw new Error(`Document ${index + 1}: expected a lowercase guide UUIDv4 ID.`);
    if (ids.has(document.id)) throw new Error(`Duplicate guide ID: ${document.id}`);
    ids.add(document.id);
    try { return validateEditorialDocument(document, document); }
    catch { throw new Error(`Document ${index + 1} (${document.id}): invalid editorial content.`); }
  });
}

function existingIds(db) {
  const table = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='editorial_content'").get();
  return new Set(table ? db.prepare("SELECT id FROM editorial_content").all().map(row => row.id) : []);
}

/** Explicit maintenance import; never replaces a document already present on the site. */
export function importEditorial({ manifestPath = DEFAULT_MANIFEST, dataDir = process.env.STUDENTPATH_DATA_DIR || join(projectRoot, ".data"), dryRun = false } = {}) {
  const documents = readEditorialManifest(resolve(manifestPath));
  const directory = resolve(dataDir);
  const filename = join(directory, "studentpath.sqlite");
  let db;
  let backupPath = null;
  try {
    let ids = new Set();
    if (existsSync(filename)) {
      db = new DatabaseSync(filename, { readOnly: true });
      ids = existingIds(db);
      db.close(); db = undefined;
    }
    const pending = documents.filter(document => !ids.has(document.id));
    const skippedIds = documents.filter(document => ids.has(document.id)).map(document => document.id);
    if (dryRun || pending.length === 0) return { dryRun, insertedIds: [], skippedIds, pendingIds: pending.map(document => document.id), backupPath };

    // Reuse the site's schema initialization without creating an account or session.
    const store = openAdminStore({ dataDir: directory });
    store.close();
    db = new DatabaseSync(filename);
    db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF;");

    // VACUUM INTO includes committed WAL data in a consistent standalone backup.
    const stamp = new Date().toISOString().replace(/[-:.]/g, "");
    backupPath = join(directory, "backups", `before-import-${stamp}-${randomUUID().slice(0, 8)}.sqlite`);
    mkdirSync(dirname(backupPath), { recursive: true, mode: 0o700 });
    db.prepare("VACUUM INTO ?").run(backupPath);

    const insertedIds = [];
    db.exec("BEGIN IMMEDIATE");
    try {
      const insert = db.prepare("INSERT INTO editorial_content(id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING");
      const timestamp = Date.now();
      for (const document of pending) {
        const result = insert.run(document.id, JSON.stringify(document), timestamp);
        if (result.changes) insertedIds.push(document.id);
        else skippedIds.push(document.id);
      }
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
    return { dryRun: false, insertedIds, skippedIds, pendingIds: [], backupPath };
  } finally { db?.close(); }
}

export function parseImportArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--data-dir" && args[index + 1] && !args[index + 1].startsWith("--") && !options.dataDir) options.dataDir = args[++index];
    else if (!argument.startsWith("--") && !options.manifestPath) options.manifestPath = argument;
    else throw new Error("Usage: npm run content:import -- [manifest.json] [--dry-run] [--data-dir PATH]");
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = importEditorial(parseImportArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify({ dryRun: result.dryRun, inserted: result.insertedIds.length, skipped: result.skippedIds.length, pending: result.pendingIds.length, backup: result.backupPath }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Content import failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
