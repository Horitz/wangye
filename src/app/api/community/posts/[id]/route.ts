import { communityDemoPosts, communityEditorialFeaturedIds } from "@/data/community-content";
import { handleCommunityPostEdit } from "@/lib/server/community-post-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  return handleCommunityPostEdit(request, id, { seedPosts: communityDemoPosts, seedFeaturedIds: communityEditorialFeaturedIds });
}
