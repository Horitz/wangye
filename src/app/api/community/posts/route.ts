import { handlePublish } from "@/lib/server/community-comments-http.mjs";

export const runtime = "nodejs";
export function POST(request: Request) { return handlePublish(request); }
