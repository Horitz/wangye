/** Cloud deployments never fall back to an ephemeral local SQLite database. */
export function isCloudDatabase(env = process.env) {
  if (env.DATABASE_URL?.trim()) return true;
  if (env.VERCEL === "1") throw new Error("database_not_configured");
  return false;
}
