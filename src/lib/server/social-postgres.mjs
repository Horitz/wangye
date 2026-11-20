import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { parseMemberProfile } from "../member-profile.mjs";
import { SocialError, normalizeMemberUsername, friendSearchTerms, MEMBER_SESSION_SECONDS } from "./social-core.mjs";
import { getPostgres } from "./postgres-connection.mjs";

const derive = promisify(scrypt);
const SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const WINDOW_MS = 15 * 60 * 1000;
const hash = value => createHash("sha256").update(value).digest("hex");
const tokenValid = value => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
const idValid = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const publicUser = row => ({ id: row.id, username: row.username, displayName: row.display_name });
const publicMessage = row => ({ id: Number(row.id), senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: Number(row.created_at) });

function validateDisplayName(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 32 || /[\u0000-\u001f\u007f]/.test(value)) throw new SocialError("invalid_display_name");
  return value.trim();
}

function validatePassword(value) {
  if (typeof value !== "string" || value.length < 10 || value.length > 128 || !value.trim() || value.includes("\0") || Buffer.byteLength(value, "utf8") > 512) throw new SocialError("invalid_password");
}

const pairFor = (userId, otherId) => {
  if (!idValid(otherId) || userId === otherId) throw new SocialError("invalid_request");
  return [userId, otherId].sort();
};

// Transaction locks work across serverless instances and release on commit or rollback.
const lock = (tx, key) => tx`SELECT pg_advisory_xact_lock(hashtext(${`studentpath:social:${key}`}))`;
const lockPair = (tx, pair) => lock(tx, `friend:${pair[0]}:${pair[1]}`);

/** Member identities remain separate from administrator identities and browser records. */
export async function openPostgresSocialStore({ now = Date.now } = {}) {
  const sql = getPostgres();

  const session = async (token, connection = sql) => {
    if (!tokenValid(token)) return null;
    const [row] = await connection`
      SELECT u.id, u.username, u.display_name
      FROM studentpath.member_sessions s
      JOIN studentpath.member_users u ON u.id = s.user_id
      WHERE s.token_hash = ${hash(token)} AND s.expires_at > ${now()}`;
    return row ? publicUser(row) : null;
  };

  const requireSession = async (token, connection = sql) => {
    const user = await session(token, connection);
    if (!user) throw new SocialError("unauthorized", 401);
    return user;
  };

  const readProfile = async (userId, connection = sql) => {
    const [row] = await connection`SELECT profile_json FROM studentpath.member_profiles WHERE user_id = ${userId}`;
    return row ? JSON.parse(row.profile_json) : null;
  };

  const reserveAttempt = (scope, username) => sql.begin(async tx => {
    await lock(tx, "auth");
    const timestamp = now();
    await tx`DELETE FROM studentpath.member_auth_attempts WHERE started_at <= ${timestamp - WINDOW_MS}`;
    const buckets = [[`${scope}:global`, scope === "register" ? 30 : 60], [`${scope}:user:${hash(username)}`, 5]];
    for (const [bucket, limit] of buckets) {
      const [previous] = await tx`SELECT count FROM studentpath.member_auth_attempts WHERE bucket = ${bucket}`;
      if (previous && Number(previous.count) >= limit) throw new SocialError("rate_limited", 429);
    }
    for (const [bucket] of buckets) {
      await tx`
        INSERT INTO studentpath.member_auth_attempts AS attempts (bucket, started_at, count)
        VALUES (${bucket}, ${timestamp}, 1)
        ON CONFLICT (bucket) DO UPDATE SET count = attempts.count + 1`;
    }
  });

  const createSession = async (tx, user) => {
    await lock(tx, `sessions:${user.id}`);
    const timestamp = now();
    await tx`DELETE FROM studentpath.member_sessions WHERE expires_at <= ${timestamp}`;
    await tx`
      DELETE FROM studentpath.member_sessions
      WHERE token_hash IN (
        SELECT token_hash FROM studentpath.member_sessions
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC, token_hash
        OFFSET 19
      )`;
    const token = randomBytes(32).toString("base64url");
    await tx`
      INSERT INTO studentpath.member_sessions (token_hash, user_id, expires_at, created_at)
      VALUES (${hash(token)}, ${user.id}, ${timestamp + MEMBER_SESSION_SECONDS * 1000}, ${timestamp})`;
    return { user, token, profile: await readProfile(user.id, tx) };
  };

  const friendship = async (tx, pair) => {
    const [row] = await tx`
      SELECT requester_id, status FROM studentpath.member_friendships
      WHERE user_low = ${pair[0]} AND user_high = ${pair[1]}`;
    return row;
  };

  const requireFriend = async (tx, userId, friendId) => {
    const pair = pairFor(userId, friendId);
    await lockPair(tx, pair);
    if ((await friendship(tx, pair))?.status !== "accepted") throw new SocialError("not_friends", 403);
    return pair;
  };

  const friendSnapshot = async (userId, connection = sql) => {
    const rows = await connection`
      SELECT u.id, u.username, u.display_name, f.requester_id, f.status
      FROM studentpath.member_friendships f
      JOIN studentpath.member_users u
        ON u.id = CASE WHEN f.user_low = ${userId} THEN f.user_high ELSE f.user_low END
      WHERE f.user_low = ${userId} OR f.user_high = ${userId}
      ORDER BY lower(u.display_name), u.username`;
    return {
      friends: rows.filter(row => row.status === "accepted").map(publicUser),
      incoming: rows.filter(row => row.status === "pending" && row.requester_id !== userId).map(publicUser),
      outgoing: rows.filter(row => row.status === "pending" && row.requester_id === userId).map(publicUser),
    };
  };

  return {
    // The connection is shared by requests; closing a store must not close the pool.
    close() {},
    session: token => session(token),
    requireSession: token => requireSession(token),

    async readPlan(userId) {
      const [row] = await sql`SELECT revision,plan_json FROM studentpath.member_plans WHERE user_id=${userId}`;
      return row ? { revision: row.revision, plan: JSON.parse(row.plan_json) } : { revision: 0, plan: null };
    },
    async savePlan(userId, revision, plan) {
      const json = JSON.stringify(plan);
      const rows = revision === 0
        ? await sql`INSERT INTO studentpath.member_plans(user_id,revision,plan_json) VALUES(${userId},1,${json})
                    ON CONFLICT DO NOTHING RETURNING revision`
        : await sql`UPDATE studentpath.member_plans SET revision=revision+1,plan_json=${json}
                    WHERE user_id=${userId} AND revision=${revision} RETURNING revision`;
      if (!rows.length) throw new SocialError("plan_changed", 409);
      return { revision: rows[0].revision, plan };
    },
    async profile(token) {
      const user = await requireSession(token);
      return readProfile(user.id);
    },

    async saveProfile(token, input) {
      const user = await requireSession(token);
      const profile = input === null ? null : parseMemberProfile(input);
      if (input !== null && profile === null) throw new SocialError("invalid_profile");
      if (profile === null) await sql`DELETE FROM studentpath.member_profiles WHERE user_id = ${user.id}`;
      else await sql`
        INSERT INTO studentpath.member_profiles (user_id, profile_json, updated_at)
        VALUES (${user.id}, ${JSON.stringify(profile)}, ${now()})
        ON CONFLICT (user_id) DO UPDATE
        SET profile_json = excluded.profile_json, updated_at = excluded.updated_at`;
      return { profile };
    },

    async register(usernameInput, displayNameInput, password) {
      const username = normalizeMemberUsername(usernameInput);
      const displayName = validateDisplayName(displayNameInput);
      validatePassword(password);
      await reserveAttempt("register", username);
      const existing = await sql`SELECT 1 FROM studentpath.member_users WHERE username = ${username}`;
      if (existing.length) throw new SocialError("username_taken", 409);
      const salt = randomBytes(32).toString("hex");
      const digest = (await derive(password, salt, 64, SCRYPT)).toString("hex");
      return sql.begin(async tx => {
        const user = { id: randomUUID(), username, displayName };
        const inserted = await tx`
          INSERT INTO studentpath.member_users (id, username, display_name, salt, password_hash, created_at)
          VALUES (${user.id}, ${username}, ${displayName}, ${salt}, ${digest}, ${now()})
          ON CONFLICT (username) DO NOTHING RETURNING id`;
        if (!inserted.length) throw new SocialError("username_taken", 409);
        return createSession(tx, user);
      });
    },

    async login(usernameInput, password) {
      let username;
      try { username = normalizeMemberUsername(usernameInput); } catch { username = "!invalid"; }
      await reserveAttempt("login", username);
      if (typeof password !== "string" || password.length > 128 || Buffer.byteLength(password, "utf8") > 512) throw new SocialError("invalid_credentials", 401);
      const [row] = await sql`SELECT * FROM studentpath.member_users WHERE username = ${username}`;
      const actual = await derive(password, row?.salt ?? "0".repeat(64), 64, SCRYPT);
      if (!timingSafeEqual(actual, Buffer.from(row?.password_hash ?? "0".repeat(128), "hex")) || !row) throw new SocialError("invalid_credentials", 401);
      return sql.begin(async tx => {
        await lock(tx, "auth");
        await tx`DELETE FROM studentpath.member_auth_attempts WHERE bucket = ${`login:user:${hash(username)}`}`;
        return createSession(tx, publicUser(row));
      });
    },

    async logout(token) {
      if (tokenValid(token)) await sql`DELETE FROM studentpath.member_sessions WHERE token_hash = ${hash(token)}`;
    },

    async search(token, query) {
      const user = await requireSession(token);
      const { username, displayName } = friendSearchTerms(query);
      const rows = await sql`
        SELECT id, username, display_name FROM studentpath.member_users
        WHERE id <> ${user.id} AND (username = ${username} OR display_name = ${displayName})
        ORDER BY (username = ${username}) DESC, username LIMIT 30`;
      return { users: rows.map(publicUser) };
    },

    async friends(token) {
      const user = await requireSession(token);
      return friendSnapshot(user.id);
    },

    updateFriend(token, otherId, action) {
      return sql.begin(async tx => {
        const user = await requireSession(token, tx);
        const pair = pairFor(user.id, otherId);
        await lockPair(tx, pair);
        const others = await tx`SELECT 1 FROM studentpath.member_users WHERE id = ${otherId}`;
        if (!others.length) throw new SocialError("user_not_found", 404);
        const previous = await friendship(tx, pair);
        if (action === "request") {
          if (previous?.status === "accepted") throw new SocialError("already_friends", 409);
          if (previous?.requester_id === otherId) throw new SocialError("request_pending", 409);
          if (!previous) await tx`
            INSERT INTO studentpath.member_friendships (user_low, user_high, requester_id, status, created_at)
            VALUES (${pair[0]}, ${pair[1]}, ${user.id}, 'pending', ${now()})`;
        } else if (action === "accept" || action === "decline") {
          if (previous?.status !== "pending" || previous.requester_id !== otherId) throw new SocialError("request_not_found", 409);
          if (action === "accept") await tx`
            UPDATE studentpath.member_friendships SET status = 'accepted'
            WHERE user_low = ${pair[0]} AND user_high = ${pair[1]}`;
          else await tx`DELETE FROM studentpath.member_friendships WHERE user_low = ${pair[0]} AND user_high = ${pair[1]}`;
        } else if (action === "cancel") {
          if (previous?.status !== "pending" || previous.requester_id !== user.id) throw new SocialError("request_not_found", 409);
          await tx`DELETE FROM studentpath.member_friendships WHERE user_low = ${pair[0]} AND user_high = ${pair[1]}`;
        } else if (action === "remove") {
          if (previous?.status !== "accepted") throw new SocialError("not_friends", 403);
          await tx`DELETE FROM studentpath.member_friendships WHERE user_low = ${pair[0]} AND user_high = ${pair[1]}`;
        } else throw new SocialError("invalid_request");
        return friendSnapshot(user.id, tx);
      });
    },

    messages(token, friendId, before) {
      return sql.begin(async tx => {
        const user = await requireSession(token, tx);
        await requireFriend(tx, user.id, friendId);
        if (before !== undefined && (!Number.isSafeInteger(before) || before < 1)) throw new SocialError("invalid_request");
        const rows = await tx`
          SELECT * FROM studentpath.member_messages
          WHERE ((sender_id = ${user.id} AND recipient_id = ${friendId})
            OR (sender_id = ${friendId} AND recipient_id = ${user.id}))
            AND id < ${before ?? Number.MAX_SAFE_INTEGER}
          ORDER BY id DESC LIMIT 51`;
        return { messages: rows.slice(0, 50).reverse().map(publicMessage), hasMore: rows.length > 50 };
      });
    },

    sendMessage(token, friendId, bodyInput, clientId) {
      return sql.begin(async tx => {
        const user = await requireSession(token, tx);
        await requireFriend(tx, user.id, friendId);
        if (typeof bodyInput !== "string" || !bodyInput.trim() || bodyInput.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(bodyInput)
          || typeof clientId !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(clientId)) throw new SocialError("invalid_message");
        const body = bodyInput.trim();
        // A client ID belongs to the sender across all recipients, not just this pair.
        await lock(tx, `message:${user.id}:${clientId}`);
        const [duplicate] = await tx`
          SELECT * FROM studentpath.member_messages
          WHERE sender_id = ${user.id} AND client_id = ${clientId}`;
        if (duplicate) {
          if (duplicate.recipient_id !== friendId || duplicate.body !== body) throw new SocialError("idempotency_conflict", 409);
          return { message: publicMessage(duplicate) };
        }
        const [message] = await tx`
          INSERT INTO studentpath.member_messages (sender_id, recipient_id, body, client_id, created_at)
          VALUES (${user.id}, ${friendId}, ${body}, ${clientId}, ${now()})
          RETURNING id, sender_id, recipient_id, body, created_at`;
        return { message: publicMessage(message) };
      });
    },
  };
}
