import { handleAdminRequest } from "@/lib/server/admin-http.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleAdminRequest(request, "session"); }
