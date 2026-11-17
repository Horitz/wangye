import { handleHubRequest } from "@/lib/server/hub-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) { return handleHubRequest(request); }
export function PUT(request: Request) { return handleHubRequest(request); }
