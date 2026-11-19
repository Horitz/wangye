import { handleActivity } from "@/lib/server/community-comments-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleActivity(request); }
export function PUT(request: Request) { return handleActivity(request); }
