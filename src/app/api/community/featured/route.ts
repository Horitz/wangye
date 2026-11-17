import { communityDemoPosts, communityEditorialFeaturedIds } from "@/data/community-content";
import { handleAdminRequest } from "@/lib/server/admin-http.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const seed = { seedPosts: communityDemoPosts, seedFeaturedIds: communityEditorialFeaturedIds };
export function GET(request: Request) { return handleAdminRequest(request, "featured-read", seed); }
export function PUT(request: Request) { return handleAdminRequest(request, "featured-write", seed); }
