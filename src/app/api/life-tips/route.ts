import { defaultLifeTips } from "@/data/life-tips";
import { handleLifeTipsRequest } from "@/lib/server/life-tips-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) { return handleLifeTipsRequest(request, defaultLifeTips); }
export function PUT(request: Request) { return handleLifeTipsRequest(request, defaultLifeTips); }
