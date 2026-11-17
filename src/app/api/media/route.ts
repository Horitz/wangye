import { handleSiteMedia } from "@/lib/server/site-media-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) { return handleSiteMedia(request); }
export function POST(request: Request) { return handleSiteMedia(request); }
