import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { AdminError, normalizeUsername, validPassword, validatePublishedPost, SESSION_SECONDS } from "./admin-core.mjs";
import { getPostgres } from "./postgres-connection.mjs";
import { COMMUNITY_FEATURED_LIMIT } from "../community-limits.mjs";
import { preparePublishedCommunityEdit } from "./community-post-schema.mjs";
import { LifeTipsValidationError, parseLifeTips, prepareLifeTips } from "./life-tips-schema.mjs";

const derive = promisify(scrypt);
const SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const WINDOW_MS = 15 * 60 * 1000;
const hash = value => createHash("sha256").update(value).digest("hex");
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, required, optional = []) => record(value)
  && required.every(key => Object.hasOwn(value, key))
  && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
const validId = value => typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/i.test(value);
const validToken = value => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);

/** Server-only Postgres counterpart of the local store; existing account and content IDs stay intact. */
export async function openPostgresAdminStore({ now = Date.now } = {}) {
  const sql = getPostgres();
  // PostgreSQL does not have SQLite's BEGIN IMMEDIATE. Serialize administrative
  // writes across instances so resets, session revocation and featured quotas agree.
  const transaction = fn => sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('studentpath:admin:write'))`;
    return fn(tx);
  });
  const session = async (token, connection = sql) => {
    if (!validToken(token)) return null;
    const [row] = await connection`
      SELECT u.id, u.username FROM studentpath.admin_sessions s
      JOIN studentpath.admin_users u ON u.id = s.user_id
      WHERE s.token_hash = ${hash(token)} AND s.expires_at > ${now()}`;
    return row ? { id: Number(row.id), username: row.username } : null;
  };
  const requireSession = async (token, connection) => {
    const user = await session(token, connection);
    if (!user) throw new AdminError("unauthorized", 401);
    return user;
  };
  const reserveAttempt = username => transaction(async tx => {
    const timestamp = now();
    await tx`DELETE FROM studentpath.login_attempts WHERE started_at <= ${timestamp - WINDOW_MS}`;
    const buckets = [["global", 60], [`user:${hash(username)}`, 5]];
    for (const [bucket, limit] of buckets) {
      const [previous] = await tx`SELECT count FROM studentpath.login_attempts WHERE bucket = ${bucket}`;
      if (previous && Number(previous.count) >= limit) throw new AdminError("rate_limited", 429);
    }
    for (const [bucket] of buckets) {
      await tx`INSERT INTO studentpath.login_attempts(bucket, started_at, count) VALUES(${bucket}, ${timestamp}, 1)
        ON CONFLICT(bucket) DO UPDATE SET count = login_attempts.count + 1`;
    }
  });
  const catalog = async (connection = sql) => {
    // Both collections share one statement snapshot, including during concurrent publication.
    const [row] = await connection`SELECT
      (SELECT coalesce(json_agg(payload::json ORDER BY is_demo DESC, created_at ASC, id ASC), '[]'::json)
        FROM studentpath.community_posts) AS posts,
      (SELECT coalesce(json_agg(post_id ORDER BY selected_at ASC, post_id ASC), '[]'::json)
        FROM studentpath.community_featured) AS featured_ids`;
    return { posts: row.posts, featuredIds: row.featured_ids };
  };
  const readLifeTips = async (defaults, connection = sql) => {
    const [row] = await connection`SELECT value FROM studentpath.app_meta WHERE key = 'life_tips_v1'`;
    try { return parseLifeTips(row ? JSON.parse(row.value) : defaults); }
    catch { throw new AdminError("unavailable", 503); }
  };
  const featuredCount = async (connection, schoolId) => {
    const [row] = await connection`SELECT count(*) AS count FROM studentpath.community_featured f
      JOIN studentpath.community_posts p ON p.id = f.post_id WHERE p.payload::jsonb ->> 'schoolId' = ${schoolId}`;
    return Number(row.count);
  };

  return {
    // Requests release transactions themselves; the serverless instance shares its bounded pool.
    close() {},
    async configured() {
      const rows = await sql`SELECT 1 FROM studentpath.admin_users LIMIT 1`;
      return rows.length > 0;
    },
    session,
    readLifeTips,
    async writeLifeTips(token, tips, defaults) {
      return transaction(async tx => {
        await requireSession(token, tx);
        const current = await readLifeTips(defaults, tx);
        let published;
        try { published = prepareLifeTips(tips, current); }
        catch (error) {
          if (error instanceof LifeTipsValidationError) throw new AdminError("invalid_request");
          throw error;
        }
        await tx`INSERT INTO studentpath.app_meta(key, value) VALUES('life_tips_v1', ${JSON.stringify(published)})
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
        return published;
      });
    },
    async readEditorial(id) {
      const [row] = await sql`SELECT payload FROM studentpath.editorial_content WHERE id = ${id}`;
      return row ? JSON.parse(row.payload) : null;
    },
    async editorialCatalog() {
      const rows = await sql`SELECT id,
        payload::jsonb ->> 'sectionId' AS section_id,
        (payload::jsonb -> 'title')::text AS title,
        (payload::jsonb -> 'summary')::text AS summary,
        (payload::jsonb -> 'author')::text AS author,
        (payload::jsonb -> 'tags')::text AS tags,
        coalesce(jsonb_array_length(payload::jsonb -> 'images'), 0) AS image_count,
        updated_at FROM studentpath.editorial_content WHERE id <> 'dashboard' ORDER BY id`;
      return rows.map(row => ({
        id: row.id, title: JSON.parse(row.title), summary: JSON.parse(row.summary), author: JSON.parse(row.author),
        ...(row.section_id ? { sectionId: row.section_id } : {}),
        ...(row.tags === null ? {} : { tags: JSON.parse(row.tags) }),
        imageCount: Number(row.image_count),
        ...(Number(row.image_count) > 0 ? { coverUrl: `/api/content/${encodeURIComponent(row.id)}/cover?v=${row.updated_at}` } : {}),
      }));
    },
    async readEditorialCover(id) {
      const [row] = await sql`SELECT payload::jsonb ->> 'id' AS id,
        payload::jsonb ->> 'sectionId' AS section_id,
        (payload::jsonb -> 'images' -> 0)::text AS image
        FROM studentpath.editorial_content WHERE id = ${id}`;
      return row ? { id: row.id, sectionId: row.section_id, image: row.image ? JSON.parse(row.image) : null } : null;
    },
    async writeEditorial(token, document) {
      return transaction(async tx => {
        await requireSession(token, tx);
        await tx`INSERT INTO studentpath.editorial_content(id, payload, updated_at)
          VALUES(${document.id}, ${JSON.stringify(document)}, ${now()})
          ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`;
        return document;
      });
    },
    async createEditorial(token, document) {
      return transaction(async tx => {
        await requireSession(token, tx);
        await tx`INSERT INTO studentpath.editorial_content(id, payload, updated_at)
          VALUES(${document.id}, ${JSON.stringify(document)}, ${now()})`;
        return document;
      });
    },
    async createAdmin(usernameInput, password, { reset = false } = {}) {
      const username = normalizeUsername(usernameInput);
      if (!validPassword(password)) throw new AdminError("invalid_password");
      const salt = randomBytes(32).toString("hex");
      const digest = (await derive(password, salt, 64, SCRYPT)).toString("hex");
      return transaction(async tx => {
        const [existing] = await tx`SELECT id FROM studentpath.admin_users WHERE username = ${username}`;
        if (reset && !existing) throw new AdminError("account_not_found");
        if (!reset && existing) throw new AdminError("account_exists");
        if (existing) {
          await tx`UPDATE studentpath.admin_users SET salt = ${salt}, password_hash = ${digest} WHERE id = ${existing.id}`;
          await tx`DELETE FROM studentpath.admin_sessions WHERE user_id = ${existing.id}`;
        } else {
          await tx`INSERT INTO studentpath.admin_users(username, salt, password_hash, created_at)
            VALUES(${username}, ${salt}, ${digest}, ${now()})`;
        }
        await tx`DELETE FROM studentpath.login_attempts WHERE bucket = ${`user:${hash(username)}`}`;
        return { username };
      });
    },
    async login(usernameInput, password) {
      let username;
      let validUsername = true;
      try { username = normalizeUsername(usernameInput); }
      catch { username = "invalid-username"; validUsername = false; }
      await reserveAttempt(username);
      if (typeof password !== "string" || password.length > 128 || Buffer.byteLength(password, "utf8") > 512) throw new AdminError("invalid_credentials", 401);
      const rows = validUsername
        ? await sql`SELECT id, username, salt, password_hash FROM studentpath.admin_users WHERE username = ${username}`
        : [];
      const row = rows[0];
      const salt = row?.salt ?? "0".repeat(64);
      const expected = row?.password_hash ?? "0".repeat(128);
      if (!/^[a-f0-9]{64}$/.test(salt) || !/^[a-f0-9]{128}$/.test(expected)) throw new AdminError("unavailable", 503);
      const actual = await derive(password, salt, 64, SCRYPT);
      if (!timingSafeEqual(actual, Buffer.from(expected, "hex")) || !row) throw new AdminError("invalid_credentials", 401);
      return transaction(async tx => {
        // A reset during scrypt invalidates this attempt before a session can be issued.
        const [current] = await tx`SELECT password_hash FROM studentpath.admin_users WHERE id = ${row.id}`;
        if (current?.password_hash !== expected) throw new AdminError("invalid_credentials", 401);
        const timestamp = now();
        await tx`DELETE FROM studentpath.admin_sessions WHERE expires_at <= ${timestamp}`;
        await tx`DELETE FROM studentpath.admin_sessions WHERE token_hash IN
          (SELECT token_hash FROM studentpath.admin_sessions WHERE user_id = ${row.id}
            ORDER BY created_at DESC, token_hash ASC OFFSET 19)`;
        const token = randomBytes(32).toString("base64url");
        await tx`INSERT INTO studentpath.admin_sessions(token_hash, user_id, expires_at, created_at)
          VALUES(${hash(token)}, ${row.id}, ${timestamp + SESSION_SECONDS * 1000}, ${timestamp})`;
        await tx`DELETE FROM studentpath.login_attempts WHERE bucket = ${`user:${hash(username)}`}`;
        return { token, username: row.username };
      });
    },
    async logout(token) {
      if (!validToken(token)) return;
      await transaction(tx => tx`DELETE FROM studentpath.admin_sessions WHERE token_hash = ${hash(token)}`);
    },
    async seed(posts, featuredIds) {
      if (!Array.isArray(posts) || !Array.isArray(featuredIds)
        || posts.some(post => !record(post) || !validId(post.id) || post.demo !== true)
        || featuredIds.some(id => !posts.some(post => post.id === id))) throw new AdminError("unavailable", 503);
      await transaction(async tx => {
        const [seeded] = await tx`SELECT 1 FROM studentpath.app_meta WHERE key = 'community_seed_v1'`;
        // Source-controlled examples may evolve; cancelled editorial selections stay cancelled.
        for (const [index, post] of posts.entries()) {
          await tx`INSERT INTO studentpath.community_posts(id, payload, is_demo, created_at)
            VALUES(${post.id}, ${JSON.stringify(post)}, 1, ${index})
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload
            WHERE community_posts.is_demo = 1 AND community_posts.payload <> excluded.payload`;
        }
        if (!seeded) {
          for (const [index, id] of featuredIds.entries()) {
            await tx`INSERT INTO studentpath.community_featured(post_id, selected_at) VALUES(${id}, ${index})`;
          }
          await tx`INSERT INTO studentpath.app_meta(key, value) VALUES('community_seed_v1', '1')`;
        }
        const excess = await tx`SELECT 1 FROM studentpath.community_featured f
          JOIN studentpath.community_posts p ON p.id = f.post_id
          GROUP BY p.payload::jsonb ->> 'schoolId' HAVING count(*) > ${COMMUNITY_FEATURED_LIMIT} LIMIT 1`;
        if (excess.length) throw new AdminError("unavailable", 503);
      });
    },
    catalog,
    async hasPublishedCommunityImage(src) {
      const rows = await sql`SELECT 1 FROM studentpath.community_posts p,
        LATERAL jsonb_array_elements(coalesce(p.payload::jsonb -> 'images', '[]'::jsonb)) AS images(value)
        WHERE p.is_demo = 0 AND images.value ->> 'src' = ${src} LIMIT 1`;
      return rows.length > 0;
    },
    async editPublishedPost(token, id, input, persistImages) {
      return transaction(async tx => {
        await requireSession(token, tx);
        if (!validId(id) || !exactKeys(input, ["post"])) throw new AdminError("invalid_request");
        const [row] = await tx`SELECT payload, is_demo FROM studentpath.community_posts WHERE id = ${id}`;
        if (!row || Number(row.is_demo)) throw new AdminError("not_found", 404);
        const current = validatePublishedPost(JSON.parse(row.payload));
        const { post, uploads } = preparePublishedCommunityEdit(input.post, current, { allowStaged: true });
        const [featured] = await tx`SELECT 1 FROM studentpath.community_featured WHERE post_id = ${id}`;
        if (post.schoolId !== current.schoolId && featured && await featuredCount(tx, post.schoolId) >= COMMUNITY_FEATURED_LIMIT) {
          throw new AdminError("featured_limit", 409);
        }
        // All authorization and quota checks precede uploads. Existing images are immutable.
        if (uploads.length) await persistImages(uploads);
        await tx`UPDATE studentpath.community_posts SET payload = ${JSON.stringify(post)} WHERE id = ${id} AND is_demo = 0`;
        return catalog(tx);
      });
    },
    async setFeatured(token, input) {
      return transaction(async tx => {
        await requireSession(token, tx);
        if (!exactKeys(input, ["postId", "featured"], ["post"]) || !validId(input.postId)
          || typeof input.featured !== "boolean") throw new AdminError("invalid_request");
        const [existing] = await tx`SELECT payload, is_demo FROM studentpath.community_posts WHERE id = ${input.postId}`;
        if (existing && Number(existing.is_demo) && input.post !== undefined) throw new AdminError("invalid_request");
        let publishedPost;
        if (!existing) {
          if (!input.featured || input.post === undefined) throw new AdminError("invalid_request");
          publishedPost = validatePublishedPost(input.post);
          const [total] = await tx`SELECT count(*) AS count FROM studentpath.community_posts`;
          if (publishedPost.id !== input.postId || Number(total.count) >= 1000) throw new AdminError("invalid_request");
        } else if (!Number(existing.is_demo) && input.post !== undefined) {
          const post = validatePublishedPost(input.post);
          if (JSON.stringify(post) !== existing.payload) throw new AdminError("invalid_request");
        }
        const [featured] = await tx`SELECT 1 FROM studentpath.community_featured WHERE post_id = ${input.postId}`;
        if (input.featured && !featured) {
          const schoolId = publishedPost?.schoolId ?? JSON.parse(existing.payload).schoolId;
          if (await featuredCount(tx, schoolId) >= COMMUNITY_FEATURED_LIMIT) throw new AdminError("featured_limit", 409);
        }
        if (publishedPost) {
          await tx`INSERT INTO studentpath.community_posts(id, payload, is_demo, created_at)
            VALUES(${publishedPost.id}, ${JSON.stringify(publishedPost)}, 0, ${now()})`;
        }
        if (input.featured) {
          await tx`INSERT INTO studentpath.community_featured(post_id, selected_at) VALUES(${input.postId}, ${now()})
            ON CONFLICT(post_id) DO NOTHING`;
        } else {
          await tx`DELETE FROM studentpath.community_featured WHERE post_id = ${input.postId}`;
        }
        return catalog(tx);
      });
    },
  };
}
