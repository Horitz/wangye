import postgres from "postgres";
import { SUPABASE_DATABASE_CA } from "./supabase-db-ca.mjs";

let connection;

/** Supabase Session pooler: postgres.js pipelining is incompatible with the shared transaction pooler. */
export function getPostgres() {
  if (!process.env.DATABASE_URL?.trim()) throw new Error("database_not_configured");
  if (!connection) {
    const address = new URL(process.env.DATABASE_URL);
    if (address.hostname.endsWith(".pooler.supabase.com") && address.port === "6543") throw new Error("use_session_pooler");
    const supabaseHost = address.hostname.endsWith(".pooler.supabase.com") || /^db\.[a-z0-9]+\.supabase\.co$/.test(address.hostname);
    const configuredCa = process.env.SUPABASE_DB_CA_CERT?.trim().replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
    const ca = configuredCa || (supabaseHost ? SUPABASE_DATABASE_CA : undefined);
    connection = postgres(process.env.DATABASE_URL, {
      // postgres.js supplies the connection hostname for TLS verification.
      // Trust the official Supabase root; never bypass certificate or hostname checks.
      ssl: { ...(ca ? { ca } : {}), rejectUnauthorized: true },
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      max_lifetime: 60 * 10,
      connection: { application_name: "studentpath" },
      onnotice: () => {},
    });
  }
  return connection;
}

/** Only command-line tasks call this; HTTP requests share the pool. */
export async function closePostgres() {
  const current = connection;
  connection = undefined;
  if (current) await current.end({ timeout: 5 });
}

