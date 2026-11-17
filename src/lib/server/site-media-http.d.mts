type Options = { dataDir?: string; now?: () => number; env?: NodeJS.ProcessEnv };
export function handleSiteMedia(request: Request, options?: Options): Promise<Response>;
export function handleEditorialMedia(request: Request, filename: string, options?: Options): Response;
