import { AdminError } from "./admin-core.mjs";
import { verifyOrigin, readJson } from "./admin-http.mjs";
import { SocialError, MEMBER_SESSION_COOKIE, MEMBER_SESSION_SECONDS } from "./social-core.mjs";
import { openSiteSocialStore } from "./site-store.mjs";

const response = (data, status = 200, extra = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
const shape = (value, keys) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export function readMemberCookie(request) {
  const found = (request.headers.get("cookie") ?? "").split(";").map(part => part.trim()).filter(part => part.startsWith(`${MEMBER_SESSION_COOKIE}=`));
  if (found.length !== 1) return null;
  const token = found[0].slice(MEMBER_SESSION_COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
function cookie(token, secure, clear = false) {
  return `${MEMBER_SESSION_COOKIE}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : MEMBER_SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}
const methods = { "plan-read": "GET", "plan-write": "PUT", session: "GET", register: "POST", login: "POST", logout: "POST", "profile-write": "PUT", users: "GET", "friends-read": "GET", "friends-write": "POST", "messages-read": "GET", "messages-write": "POST" };
export async function handleSocialRequest(request, action, { dataDir, now, env = process.env, normalizePlan } = {}) {
  let store;
  try {
    const method = methods[action];
    if (!method) throw new SocialError("invalid_request");
    if (request.method !== method) return response({ error: "invalid_request" }, 405, { Allow: method });
    const policy = verifyOrigin(request, env, method !== "GET");
    const token = readMemberCookie(request);
    store = await openSiteSocialStore({ dataDir, now, env });
    if (action === "session") {
      const user = await store.session(token);
      return response({ user, profile: user ? await store.profile(token) : null });
    }
    if (action === "register" || action === "login") {
      const input = await readJson(request, 2048);
      if (!shape(input, action === "register" ? ["username", "displayName", "password"] : ["username", "password"])) throw new SocialError("invalid_request");
      const result = action === "register" ? await store.register(input.username, input.displayName, input.password) : await store.login(input.username, input.password);
      await store.logout(token);
      return response({ user: result.user, profile: result.profile }, 200, { "Set-Cookie": cookie(result.token, policy.secure) });
    }
    if (action === "logout") {
      const input = await readJson(request, 1024);
      if (!shape(input, [])) throw new SocialError("invalid_request");
      const expectedUser = request.headers.get("x-studentpath-user");
      const currentUser = await store.session(token);
      if (expectedUser && currentUser && currentUser.id !== expectedUser) throw new SocialError("session_changed", 401);
      await store.logout(token);
      return response({ ok: true }, 200, { "Set-Cookie": cookie("", policy.secure, true) });
    }
    const user = await store.requireSession(token);
    const expectedUser = request.headers.get("x-studentpath-user");
    if (expectedUser && user.id !== expectedUser) throw new SocialError("session_changed", 401);
    if (action === "plan-read") return response(await store.readPlan(user.id));
    if (action === "plan-write") {
      const input = await readJson(request, 1024 * 1024, "content_size");
      if (!expectedUser || !shape(input, ["revision", "plan"]) || !Number.isSafeInteger(input.revision) || input.revision < 0) throw new SocialError("invalid_request");
      let plan;
      try { plan = normalizePlan(input.plan); } catch { throw new SocialError("invalid_plan"); }
      return response(await store.savePlan(user.id, input.revision, plan));
    }
    if (action === "profile-write") {
      const input = await readJson(request, 2048);
      if (!shape(input, ["profile"])) throw new SocialError("invalid_request");
      return response(await store.saveProfile(token, input.profile));
    }
    const query = new URL(request.url).searchParams;
    if (action === "users") return response(await store.search(token, query.get("q")));
    if (action === "friends-read") return response(await store.friends(token));
    if (action === "friends-write") {
      const input = await readJson(request, 1024);
      if (!shape(input, ["userId", "action"])) throw new SocialError("invalid_request");
      return response(await store.updateFriend(token, input.userId, input.action));
    }
    if (action === "messages-read") {
      const before = query.get("before");
      if (before !== null && !/^[1-9]\d*$/.test(before)) throw new SocialError("invalid_request");
      return response(await store.messages(token, query.get("friendId"), before === null ? undefined : Number(before)));
    }
    const input = await readJson(request, 10000);
    if (!shape(input, ["friendId", "body", "clientId"])) throw new SocialError("invalid_request");
    return response(await store.sendMessage(token, input.friendId, input.body, input.clientId));
  } catch (error) {
    const known = error instanceof SocialError || error instanceof AdminError;
    const status = known ? error.status : 503;
    return response({ error: known ? error.code : "unavailable" }, status, status === 429 ? { "Retry-After": "900" } : {});
  } finally { store?.close(); }
}
