export function handleCommunityComments(request: Request, id: string, options: {seedPosts: readonly {id: string}[]; seedFeaturedIds: readonly string[]}): Promise<Response>;
export function handleActivity(request: Request): Promise<Response>;
export function handlePublish(request: Request): Promise<Response>;
