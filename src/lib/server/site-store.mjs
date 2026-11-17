import { isCloudDatabase } from "./site-runtime.mjs";

export async function openSiteAdminStore(options = {}) {
  if (isCloudDatabase(options.env ?? process.env)) {
    const { openPostgresAdminStore } = await import("./admin-postgres.mjs");
    return openPostgresAdminStore(options);
  }
  const { openAdminStore } = await import("./admin-core.mjs");
  return openAdminStore(options);
}

export async function openSiteSocialStore(options = {}) {
  if (isCloudDatabase(options.env ?? process.env)) {
    const { openPostgresSocialStore } = await import("./social-postgres.mjs");
    return openPostgresSocialStore(options);
  }
  const { openSocialStore } = await import("./social-core.mjs");
  return openSocialStore(options);
}
