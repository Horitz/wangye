import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { parseMemberProfile } from "../member-profile.mjs";

const derive = promisify(scrypt);
const SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export const MEMBER_SESSION_COOKIE = "studentpath_member_session";
export const MEMBER_SESSION_SECONDS = 8 * 60 * 60;
const WINDOW_MS = 15 * 60 * 1000;
const hash = value => createHash("sha256").update(value).digest("hex");
const tokenValid = value => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
const idValid = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const publicUser = row => ({ id: row.id, username: row.username, displayName: row.display_name });
const publicMessage = row => ({ id: Number(row.id), senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: Number(row.created_at) });

export class SocialError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function normalizeMemberUsername(value) {
  if (typeof value !== "string") throw new SocialError("invalid_username");
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) throw new SocialError("invalid_username");
  return username;
}
export function friendSearchTerms(value) {
  const query = typeof value === "string" ? value.trim() : "";
  const handle = /^[@＠]/.test(query);
  const term = handle ? query.slice(1).trim() : query;
  if (!term || term.length > 32) throw new SocialError("invalid_search");
  return { username: term.toLowerCase(), displayName: handle ? null : term };
}
function validateDisplayName(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 32 || /[\u0000-\u001f\u007f]/.test(value)) throw new SocialError("invalid_display_name");
  return value.trim();
}
function validatePassword(value) {
  if (typeof value !== "string" || value.length < 10 || value.length > 128 || !value.trim() || value.includes("\0") || Buffer.byteLength(value, "utf8") > 512) throw new SocialError("invalid_password");
}

/** Member identities never confer administrator permissions or import browser records. */
export function openSocialStore({ dataDir = process.env.STUDENTPATH_DATA_DIR || resolve(process.cwd(), ".data"), now = Date.now } = {}) {
  const directory = resolve(/* turbopackIgnore: true */ dataDir);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = join(directory, "studentpath.sqlite");
  const db = new DatabaseSync(filename);
  try {
    if (process.platform !== "win32") chmodSync(filename, 0o600);
    db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA trusted_schema=OFF;
      CREATE TABLE IF NOT EXISTS member_users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS member_plans (user_id TEXT PRIMARY KEY REFERENCES member_users(id) ON DELETE CASCADE, revision INTEGER NOT NULL, plan_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS member_profiles (user_id TEXT PRIMARY KEY REFERENCES member_users(id) ON DELETE CASCADE, profile_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS member_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES member_users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS member_sessions_user ON member_sessions(user_id);
      CREATE TABLE IF NOT EXISTS member_auth_attempts (bucket TEXT PRIMARY KEY, started_at INTEGER NOT NULL, count INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS member_friendships (
        user_low TEXT NOT NULL REFERENCES member_users(id), user_high TEXT NOT NULL REFERENCES member_users(id),
        requester_id TEXT NOT NULL REFERENCES member_users(id), status TEXT NOT NULL CHECK(status IN ('pending','accepted')),
        created_at INTEGER NOT NULL, PRIMARY KEY(user_low,user_high), CHECK(user_low < user_high), CHECK(requester_id IN (user_low,user_high)));
      CREATE TABLE IF NOT EXISTS member_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT NOT NULL REFERENCES member_users(id), recipient_id TEXT NOT NULL REFERENCES member_users(id),
        body TEXT NOT NULL, client_id TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(sender_id,client_id), CHECK(sender_id <> recipient_id));
      CREATE INDEX IF NOT EXISTS member_messages_pair ON member_messages(sender_id,recipient_id,id);`);
  } catch (error) { db.close(); throw error; }
  const transaction = fn => {
    db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  };
  const session = token => {
    if (!tokenValid(token)) return null;
    const row = db.prepare("SELECT u.id,u.username,u.display_name FROM member_sessions s JOIN member_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").get(hash(token), now());
    return row ? publicUser(row) : null;
  };
  const requireSession = token => { const user = session(token); if (!user) throw new SocialError("unauthorized", 401); return user; };
  const readProfile = userId => {
    const row = db.prepare("SELECT profile_json FROM member_profiles WHERE user_id=?").get(userId);
    return row ? JSON.parse(row.profile_json) : null;
  };
  const reserveAttempt = (scope, username) => transaction(() => {
    const timestamp = now();
    db.prepare("DELETE FROM member_auth_attempts WHERE started_at<=?").run(timestamp - WINDOW_MS);
    const buckets = [[`${scope}:global`, scope === "register" ? 30 : 60], [`${scope}:user:${hash(username)}`, 5]];
    for (const [bucket, limit] of buckets) {
      const previous = db.prepare("SELECT count FROM member_auth_attempts WHERE bucket=?").get(bucket);
      if (previous && previous.count >= limit) throw new SocialError("rate_limited", 429);
    }
    for (const [bucket] of buckets) db.prepare("INSERT INTO member_auth_attempts(bucket,started_at,count) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1").run(bucket, timestamp);
  });
  const createSession = user => {
    const timestamp = now();
    db.prepare("DELETE FROM member_sessions WHERE expires_at<=?").run(timestamp);
    db.prepare("DELETE FROM member_sessions WHERE token_hash IN (SELECT token_hash FROM member_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT -1 OFFSET 19)").run(user.id);
    const token = randomBytes(32).toString("base64url");
    db.prepare("INSERT INTO member_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run(hash(token), user.id, timestamp + MEMBER_SESSION_SECONDS * 1000, timestamp);
    return { user, token, profile: readProfile(user.id) };
  };
  const pairFor = (userId, otherId) => {
    if (!idValid(otherId) || userId === otherId) throw new SocialError("invalid_request");
    return [userId, otherId].sort();
  };
  const friendship = pair => db.prepare("SELECT requester_id,status FROM member_friendships WHERE user_low=? AND user_high=?").get(...pair);
  const requireFriend = (userId, friendId) => {
    const pair = pairFor(userId, friendId);
    if (friendship(pair)?.status !== "accepted") throw new SocialError("not_friends", 403);
    return pair;
  };
  const friendSnapshot = userId => {
    const rows = db.prepare(`SELECT u.id,u.username,u.display_name,f.requester_id,f.status FROM member_friendships f
      JOIN member_users u ON u.id=CASE WHEN f.user_low=? THEN f.user_high ELSE f.user_low END
      WHERE f.user_low=? OR f.user_high=? ORDER BY u.display_name COLLATE NOCASE,u.username`).all(userId, userId, userId);
    return { friends: rows.filter(row => row.status === "accepted").map(publicUser), incoming: rows.filter(row => row.status === "pending" && row.requester_id !== userId).map(publicUser), outgoing: rows.filter(row => row.status === "pending" && row.requester_id === userId).map(publicUser) };
  };
  return {
    close: () => db.close(),
    session,
    requireSession,
    readPlan(userId) {
      const row = db.prepare("SELECT plan_json,revision FROM member_plans WHERE user_id=?").get(userId);
      return row ? { revision: row.revision, plan: JSON.parse(row.plan_json) } : { revision: 0, plan: null };
    },
    savePlan(userId, revision, plan) {
      const json = JSON.stringify(plan);
      const result = revision === 0
        ? db.prepare("INSERT INTO member_plans(user_id,revision,plan_json) VALUES(?,1,?) ON CONFLICT DO NOTHING").run(userId, json)
        : db.prepare("UPDATE member_plans SET revision=revision+1,plan_json=? WHERE user_id=? AND revision=?").run(json, userId, revision);
      if (!result.changes) throw new SocialError("plan_changed", 409);
      return { revision: revision + 1, plan };
    },
    profile(token) { return readProfile(requireSession(token).id); },
    saveProfile(token, input) {
      const user = requireSession(token);
      const profile = input === null ? null : parseMemberProfile(input);
      if (input !== null && profile === null) throw new SocialError("invalid_profile");
      if (profile === null) db.prepare("DELETE FROM member_profiles WHERE user_id=?").run(user.id);
      else db.prepare("INSERT INTO member_profiles(user_id,profile_json,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET profile_json=excluded.profile_json,updated_at=excluded.updated_at")
        .run(user.id, JSON.stringify(profile), now());
      return { profile };
    },
    async register(usernameInput, displayNameInput, password) {
      const username = normalizeMemberUsername(usernameInput);
      const displayName = validateDisplayName(displayNameInput);
      validatePassword(password);
      reserveAttempt("register", username);
      if (db.prepare("SELECT 1 FROM member_users WHERE username=?").get(username)) throw new SocialError("username_taken", 409);
      const salt = randomBytes(32).toString("hex");
      const digest = (await derive(password, salt, 64, SCRYPT)).toString("hex");
      return transaction(() => {
        if (db.prepare("SELECT 1 FROM member_users WHERE username=?").get(username)) throw new SocialError("username_taken", 409);
        const user = { id: randomUUID(), username, displayName };
        db.prepare("INSERT INTO member_users(id,username,display_name,salt,password_hash,created_at) VALUES(?,?,?,?,?,?)").run(user.id, username, displayName, salt, digest, now());
        return createSession(user);
      });
    },
    async login(usernameInput, password) {
      let username;
      try { username = normalizeMemberUsername(usernameInput); } catch { username = "!invalid"; }
      reserveAttempt("login", username);
      if (typeof password !== "string" || password.length > 128 || Buffer.byteLength(password, "utf8") > 512) throw new SocialError("invalid_credentials", 401);
      const row = db.prepare("SELECT * FROM member_users WHERE username=?").get(username);
      const actual = await derive(password, row?.salt ?? "0".repeat(64), 64, SCRYPT);
      if (!timingSafeEqual(actual, Buffer.from(row?.password_hash ?? "0".repeat(128), "hex")) || !row) throw new SocialError("invalid_credentials", 401);
      return transaction(() => {
        db.prepare("DELETE FROM member_auth_attempts WHERE bucket=?").run(`login:user:${hash(username)}`);
        return createSession(publicUser(row));
      });
    },
    logout(token) { if (tokenValid(token)) db.prepare("DELETE FROM member_sessions WHERE token_hash=?").run(hash(token)); },
    search(token, query) {
      const user = requireSession(token);
      const { username, displayName } = friendSearchTerms(query);
      const rows = db.prepare(`SELECT id,username,display_name FROM member_users WHERE id<>? AND (username=? OR display_name=?)
        ORDER BY (username=?) DESC, username LIMIT 30`).all(user.id, username, displayName, username);
      return { users: rows.map(publicUser) };
    },
    friends(token) { return friendSnapshot(requireSession(token).id); },
    updateFriend(token, otherId, action) {
      return transaction(() => {
        const user = requireSession(token);
        const pair = pairFor(user.id, otherId);
        if (!db.prepare("SELECT 1 FROM member_users WHERE id=?").get(otherId)) throw new SocialError("user_not_found", 404);
        const previous = friendship(pair);
        if (action === "request") {
          if (previous?.status === "accepted") throw new SocialError("already_friends", 409);
          if (previous?.requester_id === otherId) throw new SocialError("request_pending", 409);
          if (!previous) db.prepare("INSERT INTO member_friendships(user_low,user_high,requester_id,status,created_at) VALUES(?,?,?,'pending',?)").run(...pair, user.id, now());
        } else if (action === "accept" || action === "decline") {
          if (previous?.status !== "pending" || previous.requester_id !== otherId) throw new SocialError("request_not_found", 409);
          if (action === "accept") db.prepare("UPDATE member_friendships SET status='accepted' WHERE user_low=? AND user_high=?").run(...pair);
          else db.prepare("DELETE FROM member_friendships WHERE user_low=? AND user_high=?").run(...pair);
        } else if (action === "cancel") {
          if (previous?.status !== "pending" || previous.requester_id !== user.id) throw new SocialError("request_not_found", 409);
          db.prepare("DELETE FROM member_friendships WHERE user_low=? AND user_high=?").run(...pair);
        } else if (action === "remove") {
          if (previous?.status !== "accepted") throw new SocialError("not_friends", 403);
          db.prepare("DELETE FROM member_friendships WHERE user_low=? AND user_high=?").run(...pair);
        } else throw new SocialError("invalid_request");
        return friendSnapshot(user.id);
      });
    },
    messages(token, friendId, before) {
      const user = requireSession(token);
      requireFriend(user.id, friendId);
      if (before !== undefined && (!Number.isSafeInteger(before) || before < 1)) throw new SocialError("invalid_request");
      const rows = db.prepare(`SELECT * FROM member_messages WHERE ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) AND id<? ORDER BY id DESC LIMIT 51`)
        .all(user.id, friendId, friendId, user.id, before ?? Number.MAX_SAFE_INTEGER);
      return { messages: rows.slice(0, 50).reverse().map(publicMessage), hasMore: rows.length > 50 };
    },
    sendMessage(token, friendId, bodyInput, clientId) {
      return transaction(() => {
        const user = requireSession(token);
        requireFriend(user.id, friendId);
        if (typeof bodyInput !== "string" || !bodyInput.trim() || bodyInput.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(bodyInput)
          || typeof clientId !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(clientId)) throw new SocialError("invalid_message");
        const body = bodyInput.trim();
        const duplicate = db.prepare("SELECT * FROM member_messages WHERE sender_id=? AND client_id=?").get(user.id, clientId);
        if (duplicate) {
          if (duplicate.recipient_id !== friendId || duplicate.body !== body) throw new SocialError("idempotency_conflict", 409);
          return { message: publicMessage(duplicate) };
        }
        const timestamp = now();
        const result = db.prepare("INSERT INTO member_messages(sender_id,recipient_id,body,client_id,created_at) VALUES(?,?,?,?,?)").run(user.id, friendId, body, clientId, timestamp);
        return { message: { id: Number(result.lastInsertRowid), senderId: user.id, recipientId: friendId, body, createdAt: timestamp } };
      });
    },
  };
}
