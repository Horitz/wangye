import type { EditorialDocument } from "../../data/editorial-content";
type Options = { dataDir?: string; now?: () => number; env?: NodeJS.ProcessEnv };
export const GUIDE_SECTION_IDS: readonly string[];
export function validateEditorialDocument(value: unknown, defaults: EditorialDocument | null, options?: { creating?: boolean }): EditorialDocument;
export function handleEditorialRequest(request: Request, id: string, defaults: EditorialDocument | null | undefined, options?: Options): Promise<Response>;
export function handleEditorialCreate(request: Request, options?: Options): Promise<Response>;
export function handleEditorialCatalog(request: Request, options?: Options): Promise<Response>;
export function handleEditorialCover(request: Request, id: string, defaults: EditorialDocument | null | undefined, options?: Options): Promise<Response>;
