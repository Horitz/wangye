import { AdminError, validatePublishedPost } from "./admin-core.mjs";
import { readJson, verifyOrigin } from "./admin-http.mjs";
import { readMemberCookie } from "./social-http.mjs";
import { SocialError } from "./social-core.mjs";
import { openSiteAdminStore, openSiteSocialStore } from "./site-store.mjs";

const reply = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function communityRequest(request, options, run) {
  let posts, members;
  try {
    const writing = request.method !== "GET";
    verifyOrigin(request, options.env ?? process.env, writing);
    let author = null;
    const token = readMemberCookie(request);
    if (writing || token) {
      members = await openSiteSocialStore(options);
      author = writing ? await members.requireSession(token) : await members.session(token);
      const expected = request.headers.get("x-studentpath-user");
      if (expected && author?.id !== expected) throw new SocialError("session_changed", 401);
    }
    posts = await openSiteAdminStore(options);
    return await run(posts, author);
  } catch (error) {
    return error instanceof AdminError || error instanceof SocialError ? reply({ error: error.code }, error.status) : reply({ error: "unavailable" }, 503);
  } finally { await posts?.close(); await members?.close(); }
}

export function handleActivity(request, options = {}) {
  return communityRequest(request, options, async (posts, author) => {
    if (request.method === "PUT") {
      const { postId, liked } = await readJson(request, 1024);
      if (typeof postId !== "string" || typeof liked !== "boolean") throw new AdminError("invalid_request");
      if (!await posts.hasCommunityPost(postId)) throw new AdminError("not_found", 404);
      await posts.setLike(postId, author.id, liked);
    }
    return reply(await posts.activity(author?.id ?? null));
  });
}

export function handlePublish(request, options = {}) {
  return communityRequest(request, options, async (posts, author) => {
    const draft = await readJson(request, 32000);
    if (!/^community-[a-z0-9-]{8,90}$/i.test(draft.id) || typeof draft.title !== "string" || typeof draft.body !== "string") throw new AdminError("invalid_request");
    const bilingual = value => ({ zh: value, ru: value });
    const post = validatePublishedPost({ id: draft.id, schoolId: draft.schoolId, kind: draft.kind, topic: draft.topic,
      title: bilingual(draft.title.trim()), body: bilingual(draft.body.trim()), author: bilingual(author.displayName),
      tags: draft.tags ?? [], cover: null, demo: false, createdAt: new Date().toISOString() });
    await posts.publishMemberPost(post, author.id);
    return reply({ id: post.id });
  });
}

export function handleCommunityComments(request, id, options = {}) {
  return communityRequest(request, options, async (posts, author) => {
    if (!await posts.hasCommunityPost(id)) {
      if (!options.seedPosts?.some(post => post.id === id)) throw new AdminError("not_found", 404);
      await posts.seed(options.seedPosts, options.seedFeaturedIds);
    }
    if (request.method === "POST") {
      const { body, clientId } = await readJson(request, 10000);
      if (typeof body !== "string" || !body.trim() || body.trim().length > 1000 || body.includes("\0") ||
        typeof clientId !== "string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(clientId)) throw new AdminError("invalid_request");
      await posts.addComment(id, author, body.trim(), clientId);
    } else if (request.method === "DELETE") {
      const { commentId } = await readJson(request, 1024);
      if (!Number.isSafeInteger(commentId) || commentId < 1) throw new AdminError("invalid_request");
      await posts.removeComment(id, author.id, commentId);
    } else if (request.method !== "GET") return reply({ error: "invalid_request" }, 405);
    return reply({ comments: await posts.comments(id) });
  });
}
