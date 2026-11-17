import { handleSocialRequest } from "@/lib/server/social-http.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleSocialRequest(request, "session"); }
