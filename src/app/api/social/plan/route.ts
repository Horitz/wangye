import { parsePersonalPlan, serializePersonalPlan } from "@/lib/personal-plan-data";
import { handleSocialRequest } from "@/lib/server/social-http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleSocialRequest(request, "plan-read");
}

export function PUT(request: Request) {
  return handleSocialRequest(request, "plan-write", {
    normalizePlan: value => JSON.parse(serializePersonalPlan(parsePersonalPlan(JSON.stringify(value)))),
  });
}
