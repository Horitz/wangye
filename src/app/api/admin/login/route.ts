import { handleAdminRequest } from "@/lib/server/admin-http.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function POST(request: Request) { return handleAdminRequest(request, "login"); }
