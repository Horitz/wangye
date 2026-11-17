export const MAX_CONTENT_TAGS: 8;
export const MAX_TAG_LENGTH: 24;
export function normalizeTag(input: string): string;
export function tagKey(input: string): string;
export function normalizeTags(input: string[]): string[];
export function parseContentTags(input: unknown): string[];
