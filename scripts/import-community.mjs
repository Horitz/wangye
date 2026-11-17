import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { parsePublishedCommunityPost } from "../src/lib/community-published-schema.mjs";

const require = createRequire(import.meta.url);
const { imageSize } = require("next/dist/compiled/image-size");
const projectRoot = fileURLToPath(new URL("../", import.meta.url));

/** Validate authored posts and the local image files before opening a writable database. */
export function readCommunityManifest(manifestPath, { publicDir = join(projectRoot, "public") } = {}) {
  const input = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
  const source = Array.isArray(input) ? input : input?.posts;
  if (!Array.isArray(source) || (!Array.isArray(input) && input.version !== undefined && input.version !== 1)) {
    throw new Error("Manifest must be an array of posts or { version: 1, posts: [...] }.");
  }
  const ids = new Set();
  const checkedImages = new Set();
  return source.map((value, index) => {
    let post;
    try { post = parsePublishedCommunityPost(value); }
    catch { throw new Error(`Post ${index + 1}: invalid published community content.`); }
    if (ids.has(post.id)) throw new Error(`Duplicate post ID: ${post.id}`);
    ids.add(post.id);
    for (const image of post.images ?? []) {
      const key = `${image.src}\0${image.width}\0${image.height}`;
      if (checkedImages.has(key)) continue;
      const filename = resolve(publicDir, `.${image.src}`);
      if (!existsSync(filename) || !statSync(filename).isFile()) throw new Error(`Missing image for ${post.id}: ${image.src}`);
      const mediaRoot = realpathSync(join(publicDir, "media/community"));
      const actual = realpathSync(filename);
      const pathWithin = relative(mediaRoot, actual);
      if (!pathWithin || isAbsolute(pathWithin) || pathWithin === ".." || pathWithin.startsWith(`..${sep}`)) {
        throw new Error(`Image must be inside public/media/community: ${image.src}`);
      }
      let dimensions;
      try { dimensions = imageSize(readFileSync(actual)); }
      catch { throw new Error(`Unreadable image for ${post.id}: ${image.src}`); }
      const extension = extname(filename).slice(1).toLowerCase();
      const expectedType = extension === "jpeg" ? "jpg" : extension;
      if (dimensions.type !== expectedType || dimensions.width !== image.width || dimensions.height !== image.height) {
        throw new Error(`Image format or dimensions do not match for ${post.id}: ${image.src}`);
      }
      checkedImages.add(key);
    }
    return post;
  });
}

function existingPosts(db) {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='community_posts'").get()) return new Map();
  return new Map(db.prepare("SELECT id,payload,is_demo FROM community_posts").all().map(row => [row.id, row]));
}

function classify(posts, existing) {
  const pendingIds = [], skippedIds = [], conflictIds = [];
  for (const post of posts) {
    const row = existing.get(post.id);
    if (!row) { pendingIds.push(post.id); continue; }
    let same = false;
    try { same = row.is_demo === 0 && isDeepStrictEqual(JSON.parse(row.payload), post); } catch { /* An unreadable existing row is preserved as a conflict. */ }
    (same ? skippedIds : conflictIds).push(post.id);
  }
  return { pendingIds, skippedIds, conflictIds };
}

/** An opt-in, insert-only maintenance operation; it never changes featured selections. */
export function importCommunity({ manifestPath, dataDir = process.env.STUDENTPATH_DATA_DIR || join(projectRoot, ".data"), publicDir = join(projectRoot, "public"), apply = false } = {}) {
  if (!manifestPath) throw new Error("A community manifest path is required.");
  const posts = readCommunityManifest(manifestPath, { publicDir });
  const directory = resolve(dataDir);
  const filename = join(directory, "studentpath.sqlite");
  let db;
  let backupPath = null;
  try {
    let existing = new Map();
    if (existsSync(filename)) {
      db = new DatabaseSync(filename, { readOnly: true });
      existing = existingPosts(db);
      db.close(); db = undefined;
    }
    const plan = classify(posts, existing);
    if (!apply || plan.pendingIds.length === 0) return { dryRun: !apply, insertedIds: [], ...plan, backupPath };

    mkdirSync(directory, { recursive: true, mode: 0o700 });
    db = new DatabaseSync(filename);
    db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF;");
    backupPath = join(directory, "backups", `before-community-import-${new Date().toISOString().replace(/[-:.]/g, "")}-${randomUUID().slice(0, 8)}.sqlite`);
    mkdirSync(dirname(backupPath), { recursive: true, mode: 0o700 });
    db.prepare("VACUUM INTO ?").run(backupPath);

    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec("CREATE TABLE IF NOT EXISTS community_posts (id TEXT PRIMARY KEY, payload TEXT NOT NULL, is_demo INTEGER NOT NULL CHECK(is_demo IN (0,1)), created_at INTEGER NOT NULL)");
      // Recheck under the write lock in case another writer added a post after the preview.
      const current = classify(posts, existingPosts(db));
      const pending = new Set(current.pendingIds);
      const insert = db.prepare("INSERT INTO community_posts(id,payload,is_demo,created_at) VALUES(?,?,0,?)");
      for (const post of posts) if (pending.has(post.id)) insert.run(post.id, JSON.stringify(post), Date.parse(post.createdAt));
      db.exec("COMMIT");
      return { dryRun: false, insertedIds: current.pendingIds, skippedIds: current.skippedIds, conflictIds: current.conflictIds, pendingIds: [], backupPath };
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  } finally { db?.close(); }
}

export function parseCommunityImportArguments(args) {
  const options = {};
  let mode;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if ((argument === "--apply" || argument === "--dry-run") && !mode) { mode = argument; options.apply = argument === "--apply"; }
    else if (argument === "--data-dir" && args[index + 1] && !args[index + 1].startsWith("--") && !options.dataDir) options.dataDir = args[++index];
    else if (!argument.startsWith("--") && !options.manifestPath) options.manifestPath = argument;
    else throw new Error("Usage: node scripts/import-community.mjs MANIFEST.json [--dry-run | --apply] [--data-dir PATH]");
  }
  if (!options.manifestPath) throw new Error("Usage: node scripts/import-community.mjs MANIFEST.json [--dry-run | --apply] [--data-dir PATH]");
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = importCommunity(parseCommunityImportArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Community import failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
