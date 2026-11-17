import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import nextEnv from "@next/env";
import { getPostgres, closePostgres } from "../src/lib/server/postgres-connection.mjs";
import { uploadSiteMedia } from "../src/lib/server/supabase-media.mjs";
import { isCommunityUploadPath } from "../src/lib/site-media-paths.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
// Dependencies first. Sessions and rate-limit buckets are intentionally not migrated.
const tables = {
  admin_users: ["id", "username", "salt", "password_hash", "created_at"],
  member_users: ["id", "username", "display_name", "salt", "password_hash", "created_at"],
  member_profiles: ["user_id", "profile_json", "updated_at"],
  member_friendships: ["user_low", "user_high", "requester_id", "status", "created_at"],
  member_messages: ["id", "sender_id", "recipient_id", "body", "client_id", "created_at"],
  community_posts: ["id", "payload", "is_demo", "created_at"],
  community_featured: ["post_id", "selected_at"],
  editorial_content: ["id", "payload", "updated_at"],
  app_meta: ["key", "value"],
};

function readSnapshot(filename) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    db.exec("BEGIN");
    const existing = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
    return Object.fromEntries(Object.entries(tables).map(([name, columns]) => [name,
      existing.has(name) ? db.prepare(`SELECT ${columns.join(",")} FROM ${name}`).all().map(row => ({ ...row })) : [],
    ]));
  } finally { db.close(); }
}

async function requireEmptyTarget(sql) {
  for (const table of Object.keys(tables)) {
    const [row] = await sql.unsafe(`SELECT count(*) AS count FROM studentpath.${table}`);
    if (Number(row.count)) throw new Error("target_not_empty");
  }
}

async function moveImages(snapshot, dataDir) {
  const uploaded = new Set();
  async function upload(bytes, kind) {
    const digest = createHash("sha256").update(bytes).digest("hex");
    const path = `${kind}/${digest}.jpg`;
    if (!uploaded.has(path)) { await uploadSiteMedia(path, bytes); uploaded.add(path); }
    return kind === "editorial" ? `/media/editorial/${digest}.jpg` : `/media/community/uploads/${digest}.jpg`;
  }
  async function editorialImages(images) {
    for (const image of images ?? []) {
      if (typeof image.src === "string" && image.src.startsWith("data:image/jpeg;base64,")) {
        image.src = await upload(Buffer.from(image.src.slice(23), "base64"), "editorial");
      }
    }
  }
  for (const row of snapshot.editorial_content) {
    const document = JSON.parse(row.payload);
    await editorialImages(document.images);
    for (const step of document.steps ?? []) await editorialImages(step.images);
    row.payload = JSON.stringify(document);
  }
  for (const row of snapshot.community_posts) {
    const post = JSON.parse(row.payload);
    for (const image of post.images ?? []) {
      if (isCommunityUploadPath(image.src)) {
        // The strict path parser accepts only UUID/hash JPEG names, never directory traversal.
        const filename = image.src.split("/").at(-1);
        const bytes = await readFile(join(dataDir, "community-media", filename));
        image.src = await upload(bytes, "community");
      }
    }
    row.payload = JSON.stringify(post);
  }
  return uploaded.size;
}

async function main() {
  nextEnv.loadEnvConfig(root, false);
  const args = process.argv.slice(2);
  let apply = false;
  let dataDir = resolve(process.env.STUDENTPATH_DATA_DIR || join(root, ".data"));
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") apply = true;
    else if (args[i] === "--source" && args[i + 1]) dataDir = resolve(args[++i]);
    else throw new Error("usage");
  }
  const snapshot = readSnapshot(join(dataDir, "studentpath.sqlite"));
  // Counts only: never print messages, account hashes, content, or connection credentials.
  for (const [table, rows] of Object.entries(snapshot)) process.stdout.write(`${table}: ${rows.length}\n`);
  if (!apply) {
    process.stdout.write("仅列出本机待迁移数量；加 --apply 才上传到已配置的空云数据库。\n");
    return;
  }
  const sql = getPostgres();
  try {
    await requireEmptyTarget(sql);
    const images = await moveImages(snapshot, dataDir);
    await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('studentpath:admin:write'))`;
      await tx`SELECT pg_advisory_xact_lock(hashtext('studentpath:social:auth'))`;
      // Registration and ordinary member writes do not all hold the auth lock.
      // Lock this fixed table list before checking emptiness; concurrent writes
      // must finish first or wait until the complete import commits.
      await tx.unsafe(`LOCK TABLE ${Object.keys(tables).map(table => `studentpath.${table}`).join(", ")} IN SHARE ROW EXCLUSIVE MODE`);
      await requireEmptyTarget(tx);
      for (const [table, columns] of Object.entries(tables)) {
        const statement = `INSERT INTO studentpath.${table} (${columns.join(",")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")})`;
        for (const row of snapshot[table]) await tx.unsafe(statement, columns.map(column => row[column]));
      }
      for (const table of ["admin_users", "member_messages"]) {
        await tx.unsafe(`SELECT setval(pg_get_serial_sequence('studentpath.${table}', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM studentpath.${table}`);
      }
      await tx`INSERT INTO studentpath.app_meta(key,value) VALUES('cloud_migration_v1', ${JSON.stringify({ at: Date.now(), images })})`;
    });
    process.stdout.write(`站点数据迁移完成，${images} 张图片已存入 Storage。本机数据库未改动，云端需要重新登录。\n`);
  } finally { await closePostgres(); }
}

main().catch(error => {
  const messages = {
    target_not_empty: "云端已有数据，已停止，未覆盖任何云端记录。请使用新的空项目或先人工确认迁移方案。",
    usage: "用法：npm run db:migrate:site -- [--apply] [--source DATA_DIRECTORY]",
  };
  process.stderr.write(`${messages[error.message] || "迁移未完成，请检查数据库/Storage配置与原始图片文件。本机数据保持不变，可修正后重新迁移。"}\n`);
  process.exitCode = 1;
});

