export type SocialAction = "session" | "register" | "login" | "logout" | "profile-write" | "users" | "friends-read" | "friends-write" | "messages-read" | "messages-write";
export function handleSocialRequest(request: Request, action: SocialAction, options?: { dataDir?: string; now?: () => number; env?: NodeJS.ProcessEnv }): Promise<Response>;
export function readMemberCookie(request: Request): string | null;
