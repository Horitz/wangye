import type { CommunityPost } from "../../data/community-content";
export function handleAdminRequest(request: Request, action: "session" | "login" | "logout" | "featured-read" | "featured-write", options?: { dataDir?: string; now?: () => number; env?: NodeJS.ProcessEnv; seedPosts?: CommunityPost[]; seedFeaturedIds?: string[] }): Promise<Response>;
export function verifyOrigin(request: Request, env?: NodeJS.ProcessEnv, mutating?: boolean): { secure: boolean };
export function readSessionCookie(request: Request): string | null;
export function sessionCookie(token: string, secure: boolean, clear?: boolean): string;
export function readJson(request: Request, limit: number, sizeError?: "invalid_request" | "content_size"): Promise<Record<string, unknown>>;
