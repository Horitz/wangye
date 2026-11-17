import { handleEditorialCatalog, handleEditorialCreate } from "@/lib/server/editorial-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleEditorialCatalog(request); }
export function POST(request: Request) { return handleEditorialCreate(request); }
