import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { getPostgres, closePostgres } from "../src/lib/server/postgres-connection.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const migration = new URL("../supabase/migrations/202611170001_studentpath.sql", import.meta.url);

async function main() {
  nextEnv.loadEnvConfig(projectRoot, false);
  const source = await readFile(migration, "utf8");
  try {
    const sql = getPostgres();
    // Only this checked-in file is executed; no user-provided SQL or credentials are printed.
    await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('studentpath:schema:init'))`;
      await tx.unsafe(source).simple();
    });
  } finally {
    await closePostgres();
  }
  process.stdout.write("云端数据库结构已初始化，现有记录未覆盖。Cloud schema initialized; existing records retained.\n");
}

main().catch(error => {
  const code = typeof error?.code === "string" && /^[A-Z0-9_]{1,40}$/.test(error.code) ? ` (${error.code})` : "";
  process.stderr.write(`云端初始化未完成${code}。请检查数据库连接与迁移权限。Cloud initialization failed; check the connection and migration privileges.\n`);
  process.exitCode = 1;
});
