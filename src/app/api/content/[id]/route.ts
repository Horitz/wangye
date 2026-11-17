import { getEditorialDefault } from "@/data/editorial-content";
import { handleEditorialRequest } from "@/lib/server/editorial-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return handleEditorialRequest(request, id, getEditorialDefault(id));
}
export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  return handleEditorialRequest(request, id, getEditorialDefault(id));
}
