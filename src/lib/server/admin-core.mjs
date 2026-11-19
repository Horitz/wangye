import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { COMMUNITY_FEATURED_LIMIT } from "../community-limits.mjs";
import { parsePublishedCommunityPost } from "../community-published-schema.mjs";
import { preparePublishedCommunityEdit } from "./community-post-schema.mjs";
import { LifeTipsValidationError, parseLifeTips, prepareLifeTips } from "./life-tips-schema.mjs";

const derive = promisify(scrypt);
const SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export const SESSION_SECONDS = 8 * 60 * 60;
export const SESSION_COOKIE = "studentpath_admin_session";
const WINDOW_MS = 15 * 60 * 1000;
const hash = value => createHash("sha256").update(value).digest("hex");
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, required, optional = []) => record(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
const validId = value => typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/i.test(value);
export class AdminError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function normalizeUsername(value) {
  if (typeof value !== "string") throw new AdminError("invalid_request");
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username)) throw new AdminError("invalid_request");
  return username;
}
export function validPassword(value) {
  return typeof value === "string" && value.length >= 12 && value.length <= 128 && value.trim().length > 0 && !value.includes("\0") && Buffer.byteLength(value, "utf8") <= 512;
}
export function validatePublishedPost(value) {
  try { return parsePublishedCommunityPost(value); }
  catch { throw new AdminError("invalid_request"); }
}

export function sameMemberSubmission(row, authorId, post) {
  if (!row) return false;
  const stored = JSON.parse(row.payload);
  if (row.author_id !== authorId || stored.title.zh !== post.title.zh || stored.body.zh !== post.body.zh ||
      stored.schoolId !== post.schoolId || stored.topic !== post.topic || stored.kind !== post.kind ||
      JSON.stringify(stored.tags ?? []) !== JSON.stringify(post.tags ?? [])) throw new AdminError("post_exists", 409);
  return true;
}

/** A connection owns no credentials in globals; callers close it after every operation. */
export function openAdminStore({ dataDir = process.env.STUDENTPATH_DATA_DIR || resolve(process.cwd(), ".data"), now = Date.now } = {}) {
  const directory = resolve(/* turbopackIgnore: true */ dataDir);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = join(directory, "studentpath.sqlite");
  const db = new DatabaseSync(filename);
  try {
    if (process.platform !== "win32") chmodSync(filename, 0o600);
    db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA trusted_schema=OFF;
      CREATE TABLE IF NOT EXISTS admin_users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS admin_sessions_user ON admin_sessions(user_id);
      CREATE TABLE IF NOT EXISTS login_attempts (bucket TEXT PRIMARY KEY, started_at INTEGER NOT NULL, count INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS community_posts (id TEXT PRIMARY KEY, payload TEXT NOT NULL, is_demo INTEGER NOT NULL CHECK(is_demo IN (0,1)), created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS community_featured (post_id TEXT PRIMARY KEY REFERENCES community_posts(id) ON DELETE CASCADE, selected_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS community_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES member_users(id), display_name TEXT NOT NULL, body TEXT NOT NULL,
        client_id TEXT NOT NULL, UNIQUE(post_id,author_id,client_id));
      CREATE INDEX IF NOT EXISTS community_comments_thread ON community_comments(post_id,id);
      CREATE TABLE IF NOT EXISTS community_likes (
        post_id TEXT REFERENCES community_posts(id) ON DELETE CASCADE, author_id TEXT REFERENCES member_users(id),
        PRIMARY KEY(post_id,author_id));
      CREATE TABLE IF NOT EXISTS community_authors (
        post_id TEXT PRIMARY KEY REFERENCES community_posts(id) ON DELETE CASCADE, author_id TEXT NOT NULL REFERENCES member_users(id));
      CREATE TABLE IF NOT EXISTS editorial_content (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  } catch (error) { db.close(); throw error; }

  const transaction = fn => {
    db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  };
  const session = token => {
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const row = db.prepare("SELECT u.id, u.username FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").get(hash(token), now());
    return row ? { id: Number(row.id), username: row.username } : null;
  };
  const requireSession = token => { const user = session(token); if (!user) throw new AdminError("unauthorized", 401); return user; };
  const reserveAttempt = username => transaction(() => {
    const timestamp = now();
    db.prepare("DELETE FROM login_attempts WHERE started_at<=?").run(timestamp - WINDOW_MS);
    const buckets = [["global", 60], [`user:${hash(username)}`, 5]];
    for (const [bucket, limit] of buckets) {
      const previous = db.prepare("SELECT count FROM login_attempts WHERE bucket=?").get(bucket);
      if (previous && Number(previous.count) >= limit) throw new AdminError("rate_limited", 429);
    }
    for (const [bucket] of buckets) db.prepare("INSERT INTO login_attempts(bucket,started_at,count) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1").run(bucket, timestamp);
    // The global bucket bounds new account buckets to 60 per window, including unknown users.
  });
  const catalog = () => ({
    posts: db.prepare("SELECT payload FROM community_posts ORDER BY is_demo DESC, created_at ASC, id ASC").all().map(row => JSON.parse(row.payload)),
    featuredIds: db.prepare("SELECT post_id FROM community_featured ORDER BY selected_at ASC, post_id ASC").all().map(row => row.post_id),
    commentCounts: Object.fromEntries(db.prepare("SELECT post_id, count(*) AS total FROM community_comments GROUP BY post_id").all().map(r => [r.post_id, r.total])),
  });
  const readLifeTips = defaults => {
    const row = db.prepare("SELECT value FROM app_meta WHERE key='life_tips_v1'").get();
    try { return parseLifeTips(row ? JSON.parse(row.value) : defaults); }
    catch { throw new AdminError("unavailable", 503); }
  };
  return {
    close: () => db.close(),
    configured: () => Boolean(db.prepare("SELECT 1 FROM admin_users LIMIT 1").get()),
    session,
    readLifeTips,
    writeLifeTips(token, tips, defaults) {
      return transaction(() => {
        requireSession(token);
        const current = readLifeTips(defaults);
        let published;
        try { published = prepareLifeTips(tips, current); }
        catch (error) {
          if (error instanceof LifeTipsValidationError) throw new AdminError("invalid_request");
          throw error;
        }
        db.prepare("INSERT INTO app_meta(key,value) VALUES('life_tips_v1',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
          .run(JSON.stringify(published));
        return published;
      });
    },
    readEditorial(id) {
      const row = db.prepare("SELECT payload FROM editorial_content WHERE id=?").get(id);
      return row ? JSON.parse(row.payload) : null;
    },
    editorialCatalog() {
      return db.prepare("SELECT id, json_extract(payload,'$.sectionId') AS section_id, json_extract(payload,'$.title') AS title, json_extract(payload,'$.summary') AS summary, json_extract(payload,'$.author') AS author, json_extract(payload,'$.tags') AS tags, coalesce(json_array_length(payload,'$.images'),0) AS image_count, updated_at FROM editorial_content WHERE id <> 'dashboard' ORDER BY id").all()
        .map(row => ({
          id: row.id, title: JSON.parse(row.title), summary: JSON.parse(row.summary), author: JSON.parse(row.author),
          ...(row.section_id ? { sectionId: row.section_id } : {}),
          ...(row.tags === null ? {} : { tags: JSON.parse(row.tags) }),
          imageCount: row.image_count,
          ...(row.image_count > 0 ? { coverUrl: `/api/content/${encodeURIComponent(row.id)}/cover?v=${row.updated_at}` } : {}),
        }));
    },
    readEditorialCover(id) {
      const row = db.prepare("SELECT json_extract(payload,'$.id') AS id, json_extract(payload,'$.sectionId') AS section_id, json_extract(payload,'$.images[0]') AS image FROM editorial_content WHERE id=?").get(id);
      return row ? { id: row.id, sectionId: row.section_id, image: row.image ? JSON.parse(row.image) : null } : null;
    },
    writeEditorial(token, document) {
      requireSession(token);
      db.prepare("INSERT INTO editorial_content(id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at")
        .run(document.id, JSON.stringify(document), now());
      return document;
    },
    createEditorial(token, document) {
      requireSession(token);
      db.prepare("INSERT INTO editorial_content(id,payload,updated_at) VALUES(?,?,?)")
        .run(document.id, JSON.stringify(document), now());
      return document;
    },
    async createAdmin(usernameInput, password, { reset = false } = {}) {
      const username = normalizeUsername(usernameInput);
      if (!validPassword(password)) throw new AdminError("invalid_password");
      const salt = randomBytes(32).toString("hex");
      const digest = (await derive(password, salt, 64, SCRYPT)).toString("hex");
      return transaction(() => {
        const existing = db.prepare("SELECT id FROM admin_users WHERE username=?").get(username);
        if (reset && !existing) throw new AdminError("account_not_found");
        if (!reset && existing) throw new AdminError("account_exists");
        if (existing) {
          db.prepare("UPDATE admin_users SET salt=?,password_hash=? WHERE id=?").run(salt, digest, existing.id);
          db.prepare("DELETE FROM admin_sessions WHERE user_id=?").run(existing.id);
        } else db.prepare("INSERT INTO admin_users(username,salt,password_hash,created_at) VALUES(?,?,?,?)").run(username, salt, digest, now());
        db.prepare("DELETE FROM login_attempts WHERE bucket=?").run(`user:${hash(username)}`);
        return { username };
      });
    },
    async login(usernameInput, password) {
      let username;
      let validUsername = true;
      try { username = normalizeUsername(usernameInput); } catch { username = "invalid-username"; validUsername = false; }
      reserveAttempt(username);
      if (typeof password !== "string" || password.length > 128 || Buffer.byteLength(password, "utf8") > 512) throw new AdminError("invalid_credentials", 401);
      const row = validUsername ? db.prepare("SELECT id, username, salt, password_hash FROM admin_users WHERE username=?").get(username) : undefined;
      const salt = row?.salt ?? "0".repeat(64);
      const expected = row?.password_hash ?? "0".repeat(128);
      if (!/^[a-f0-9]{64}$/.test(salt) || !/^[a-f0-9]{128}$/.test(expected)) throw new AdminError("unavailable", 503);
      const actual = await derive(password, salt, 64, SCRYPT);
      if (!timingSafeEqual(actual, Buffer.from(expected, "hex")) || !row) throw new AdminError("invalid_credentials", 401);
      return transaction(() => {
        // A concurrent CLI password reset must invalidate a login already hashing the old password.
        const current = db.prepare("SELECT password_hash FROM admin_users WHERE id=?").get(row.id);
        if (current?.password_hash !== expected) throw new AdminError("invalid_credentials", 401);
        const timestamp = now();
        db.prepare("DELETE FROM admin_sessions WHERE expires_at<=?").run(timestamp);
        db.prepare("DELETE FROM admin_sessions WHERE token_hash IN (SELECT token_hash FROM admin_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT -1 OFFSET 19)").run(row.id);
        const token = randomBytes(32).toString("base64url");
        db.prepare("INSERT INTO admin_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run(hash(token), row.id, timestamp + SESSION_SECONDS * 1000, timestamp);
        db.prepare("DELETE FROM login_attempts WHERE bucket=?").run(`user:${hash(username)}`);
        return { token, username: row.username };
      });
    },
    logout(token) {
      if (typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token)) db.prepare("DELETE FROM admin_sessions WHERE token_hash=?").run(hash(token));
    },
    seed(posts, featuredIds) {
      if (!Array.isArray(posts) || !Array.isArray(featuredIds) || posts.some(post => !record(post) || !validId(post.id) || post.demo !== true) || featuredIds.some(id => !posts.some(post => post.id === id))) throw new AdminError("unavailable", 503);
      transaction(() => {
        const seeded = Boolean(db.prepare("SELECT 1 FROM app_meta WHERE key='community_seed_v1'").get());
        // Source-controlled examples may evolve, but editorial choices are initialized once only.
        posts.forEach((post, index) => db.prepare("INSERT INTO community_posts(id,payload,is_demo,created_at) VALUES(?,?,1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload WHERE community_posts.is_demo=1 AND community_posts.payload<>excluded.payload").run(post.id, JSON.stringify(post), index));
        if (seeded) return;
        featuredIds.forEach((id, index) => db.prepare("INSERT INTO community_featured(post_id,selected_at) VALUES(?,?)").run(id, index));
        db.prepare("INSERT INTO app_meta(key,value) VALUES('community_seed_v1','1')").run();
      });
    },
    catalog,
    publishMemberPost(post, authorId) {
      return transaction(() => {
        const existing = db.prepare("SELECT p.payload,a.author_id FROM community_posts p LEFT JOIN community_authors a ON a.post_id=p.id WHERE p.id=?").get(post.id);
        if (sameMemberSubmission(existing, authorId, post)) return;
        db.prepare("INSERT INTO community_posts(id,payload,is_demo,created_at) VALUES(?,?,0,?)").run(post.id, JSON.stringify(post), now());
        db.prepare("INSERT INTO community_authors(post_id,author_id) VALUES(?,?)").run(post.id, authorId);
      });
    },
    setLike(id, authorId, liked) {
      if (liked) db.prepare("INSERT INTO community_likes(post_id,author_id) VALUES(?,?) ON CONFLICT DO NOTHING").run(id, authorId);
      else db.prepare("DELETE FROM community_likes WHERE post_id=? AND author_id=?").run(id, authorId);
    },
    activity(viewerId) {
      const counts = rows => Object.fromEntries(rows.map(row => [row.post_id, row.total]));
      return { viewerId, postCount: db.prepare("SELECT count(*) AS n FROM community_posts").get().n,
        likeCounts: counts(db.prepare("SELECT post_id,count(*) AS total FROM community_likes GROUP BY post_id").all()),
        commentCounts: counts(db.prepare("SELECT post_id,count(*) AS total FROM community_comments GROUP BY post_id").all()),
        likedIds: db.prepare("SELECT post_id FROM community_likes WHERE author_id=?").all(viewerId).map(row => row.post_id),
        ownIds: db.prepare("SELECT post_id FROM community_authors WHERE author_id=?").all(viewerId).map(row => row.post_id) };
    },
    hasCommunityPost(id) { return Boolean(db.prepare("SELECT 1 FROM community_posts WHERE id=?").get(id)); },
    comments(postId) {
      return db.prepare("SELECT id,author_id AS authorId,display_name AS displayName,body FROM community_comments WHERE post_id=? ORDER BY id").all(postId);
    },
    addComment(postId, author, body, clientId) {
      const row = db.prepare(`INSERT INTO community_comments(post_id,author_id,display_name,body,client_id) VALUES(?,?,?,?,?)
        ON CONFLICT(post_id,author_id,client_id) DO UPDATE SET client_id=excluded.client_id RETURNING body`).get(postId, author.id, author.displayName, body, clientId);
      if (row.body !== body) throw new AdminError("idempotency_conflict", 409);
    },
    removeComment(postId, authorId, id) {
      if (!db.prepare("DELETE FROM community_comments WHERE post_id=? AND author_id=? AND id=?").run(postId, authorId, id).changes) throw new AdminError("not_found", 404);
    },
    hasPublishedCommunityImage(src) {
      return Boolean(db.prepare("SELECT 1 FROM community_posts p, json_each(p.payload,'$.images') image WHERE p.is_demo=0 AND json_extract(image.value,'$.src')=? LIMIT 1").get(src));
    },
    editPublishedPost(token, id, input, persistImages) {
      return transaction(() => {
        requireSession(token);
        if (!validId(id) || !exactKeys(input, ["post"])) throw new AdminError("invalid_request");
        const row = db.prepare("SELECT payload,is_demo FROM community_posts WHERE id=?").get(id);
        if (!row || row.is_demo) throw new AdminError("not_found", 404);
        const current = validatePublishedPost(JSON.parse(row.payload));
        const { post, uploads } = preparePublishedCommunityEdit(input.post, current);
        if (post.schoolId !== current.schoolId && db.prepare("SELECT 1 FROM community_featured WHERE post_id=?").get(id)) {
          const selected = db.prepare("SELECT COUNT(*) AS count FROM community_featured f JOIN community_posts p ON p.id=f.post_id WHERE json_extract(p.payload,'$.schoolId')=?").get(post.schoolId);
          if (Number(selected.count) >= COMMUNITY_FEATURED_LIMIT) throw new AdminError("featured_limit", 409);
        }
        // All authorization, identities and quota checks precede file publication.
        // Old photo files are never deleted or overwritten by an edit.
        if (uploads.length) persistImages(uploads);
        db.prepare("UPDATE community_posts SET payload=? WHERE id=? AND is_demo=0").run(JSON.stringify(post), id);
        return catalog();
      });
    },
    setFeatured(token, input) {
      return transaction(() => {
        requireSession(token);
        if (!exactKeys(input, ["postId", "featured"], ["post"]) || !validId(input.postId) || typeof input.featured !== "boolean") throw new AdminError("invalid_request");
        const existing = db.prepare("SELECT payload,is_demo FROM community_posts WHERE id=?").get(input.postId);
        if (existing?.is_demo && input.post !== undefined) throw new AdminError("invalid_request");
        let publishedPost;
        if (!existing) {
          if (!input.featured || input.post === undefined) throw new AdminError("invalid_request");
          publishedPost = validatePublishedPost(input.post);
          if (publishedPost.id !== input.postId || Number(db.prepare("SELECT COUNT(*) AS count FROM community_posts").get().count) >= 1000) throw new AdminError("invalid_request");
        } else if (!existing.is_demo && input.post !== undefined) {
          const post = validatePublishedPost(input.post);
          if (JSON.stringify(post) !== existing.payload) throw new AdminError("invalid_request");
        }
        if (input.featured && !db.prepare("SELECT 1 FROM community_featured WHERE post_id=?").get(input.postId)) {
          const schoolId = publishedPost?.schoolId ?? JSON.parse(existing.payload).schoolId;
          const selected = db.prepare("SELECT COUNT(*) AS count FROM community_featured f JOIN community_posts p ON p.id=f.post_id WHERE json_extract(p.payload,'$.schoolId')=?").get(schoolId);
          if (Number(selected.count) >= COMMUNITY_FEATURED_LIMIT) throw new AdminError("featured_limit", 409);
        }
        if (publishedPost) db.prepare("INSERT INTO community_posts(id,payload,is_demo,created_at) VALUES(?,?,0,?)").run(publishedPost.id, JSON.stringify(publishedPost), now());
        if (input.featured) db.prepare("INSERT OR IGNORE INTO community_featured(post_id,selected_at) VALUES(?,?)").run(input.postId, now());
        else db.prepare("DELETE FROM community_featured WHERE post_id=?").run(input.postId);
        return catalog();
      });
    },
  };
}
