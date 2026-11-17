/** Same-origin media references accepted by both the editor and the server. */
const sha256 = "[a-f0-9]{64}";
const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}";
const editorialPath = new RegExp(`^/media/editorial/${sha256}\\.jpg$`);
const communityPath = new RegExp(`^/media/community/uploads/(?:${sha256}|${uuid})\\.jpg$`);
const stagedCommunityPath = new RegExp(`^/media/community/uploads/${sha256}\\.jpg$`);

export const isEditorialMediaPath = value => typeof value === "string" && editorialPath.test(value);
export const isCommunityUploadPath = value => typeof value === "string" && communityPath.test(value);
export const isStagedCommunityUploadPath = value => typeof value === "string" && stagedCommunityPath.test(value);
