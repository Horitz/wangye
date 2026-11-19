import { communityDemoPosts, communityEditorialFeaturedIds } from "@/data/community-content";
import { handleCommunityComments } from "@/lib/server/community-comments-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function comments(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleCommunityComments(request, (await context.params).id, { seedPosts: communityDemoPosts, seedFeaturedIds: communityEditorialFeaturedIds });
}

export { comments as GET, comments as POST, comments as DELETE };
