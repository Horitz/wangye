import type { CommunityPost } from "../../data/community-content";
type Options = { dataDir?: string; now?: () => number; env?: NodeJS.ProcessEnv; seedPosts?: CommunityPost[]; seedFeaturedIds?: string[] };
export function handleCommunityPostEdit(request: Request, id: string, options?: Options): Promise<Response>;
export function handleCommunityMedia(request: Request, filename: string, options?: Options): Promise<Response>;
