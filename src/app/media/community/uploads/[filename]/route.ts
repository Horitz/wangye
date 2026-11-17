import { handleCommunityMedia } from "@/lib/server/community-post-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ filename: string }> };

export async function GET(request: Request, context: Context) {
  const { filename } = await context.params;
  return handleCommunityMedia(request, filename);
}
export async function HEAD(request: Request, context: Context) {
  const { filename } = await context.params;
  return handleCommunityMedia(request, filename);
}
