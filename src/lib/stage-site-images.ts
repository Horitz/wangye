"use client";

import { isCommunityUploadPath, isEditorialMediaPath } from "@/lib/site-media-paths.mjs";

/** Return a detached list so a failed upload or save never clears the editor's original draft. */
export async function stageSiteImages<T extends { src: string }>(images: T[], kind: "editorial" | "community"): Promise<T[]> {
  if (!images.some(image => image.src.startsWith("data:"))) return images;
  const capability = await fetch("/api/media", { cache: "no-store", credentials: "same-origin" });
  if (!capability.ok) throw new Error(capability.status === 401 ? "unauthorized" : "save");
  const { enabled } = await capability.json();
  if (enabled === false) return images;
  if (enabled !== true) throw new Error("save");
  const staged: T[] = [];
  for (const image of images) {
    if (!image.src.startsWith("data:")) { staged.push(image); continue; }
    const result = await fetch("/api/media", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, kind }),
    });
    if (!result.ok) throw new Error(result.status === 401 ? "unauthorized" : result.status === 413 ? "content-size" : "save");
    const { src } = await result.json();
    if (!(kind === "editorial" ? isEditorialMediaPath(src) : isCommunityUploadPath(src))) throw new Error("save");
    staged.push({ ...image, src });
  }
  return staged;
}
