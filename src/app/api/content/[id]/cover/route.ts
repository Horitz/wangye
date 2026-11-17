import { getEditorialDefault } from "@/data/editorial-content";
import { handleEditorialCover } from "@/lib/server/editorial-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleEditorialCover(request, id, getEditorialDefault(id));
}
