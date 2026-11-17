import { handleSocialRequest } from "@/lib/server/social-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function PUT(request: Request) {
  return handleSocialRequest(request, "profile-write");
}
