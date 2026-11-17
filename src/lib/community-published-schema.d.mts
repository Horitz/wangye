import type { CommunityPost } from '../data/community-content';
export const COMMUNITY_IMAGE_LIMIT: 24;
export const COMMUNITY_IMAGE_EDGE_LIMIT: 3200;
export type PublishedCommunityPost = CommunityPost & { cover: null; demo: false; createdAt: string };
/** Validates and deep-copies one site post. Throws Error('invalid_request') on invalid data. */
export function parsePublishedCommunityPost(value: unknown): PublishedCommunityPost;
