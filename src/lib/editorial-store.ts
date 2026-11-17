"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getEditorialDefault, type EditorialDocument } from "@/data/editorial-content";
import { guidePreviews, type GuidePreview, type LocalizedText } from "@/data/home-content";
import { getGuideSection, isCustomGuideId } from "@/data/guide-sections";
import { EDITORIAL_BODY_LIMIT } from "@/lib/guide-media-limits.mjs";
import { parseContentTags } from "@/lib/content-tags.mjs";
import { stageSiteImages } from "@/lib/stage-site-images";

const updatedEvent = "studentpath:content-updated";
async function stageEditorial(document: EditorialDocument): Promise<EditorialDocument> {
  const images = await stageSiteImages(document.images, "editorial");
  const steps: EditorialDocument["steps"] = [];
  for (const step of document.steps) steps.push({ ...step, images: await stageSiteImages(step.images, "editorial") });
  return { ...document, images, steps };
}
function encodeEditorial(document: EditorialDocument) {
  const body = JSON.stringify({ ...document, ...(Object.hasOwn(document, "tags") ? { tags: parseContentTags(document.tags) } : {}) });
  if (new TextEncoder().encode(body).byteLength > EDITORIAL_BODY_LIMIT) throw new Error("content-size");
  return body;
}
export function useEditorialDocument(id: string) {
  const revision = useRef(0);
  const [document, setDocument] = useState<EditorialDocument | undefined>(() => getEditorialDefault(id));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => {
    revision.current++;
    setLoading(true);
    setAttempt(value => value + 1);
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      const request = ++revision.current;
      try {
        const response = await fetch(`/api/content/${id}`, { cache: "no-store" });
        if (!response.ok) throw new Error("load");
        const result = await response.json();
        const loaded = result.document ?? getEditorialDefault(id);
        if (!loaded) throw new Error("load");
        if (active && request === revision.current) { setDocument(loaded); setError(false); }
      } catch { if (active && request === revision.current) setError(true); }
      finally { if (active && request === revision.current) setLoading(false); }
    }
    void load();
    window.addEventListener(updatedEvent, load);
    return () => { active = false; window.removeEventListener(updatedEvent, load); };
  }, [id, attempt]);
  async function save(next: EditorialDocument) {
    revision.current++;
    const staged = await stageEditorial(next);
    const response = await fetch(`/api/content/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: encodeEditorial(staged) });
    if (!response.ok) throw new Error(response.status === 401 ? "unauthorized" : "save");
    const result = await response.json();
    revision.current++;
    setDocument(result.document ?? next);
    setError(false);
    window.dispatchEvent(new Event(updatedEvent));
  }
  return { document, loading, error, save, reload };
}

type Summary = { id: string; sectionId?: string; tags?: string[]; title: LocalizedText; summary: LocalizedText; author: EditorialDocument["author"]; coverUrl?: string; imageCount: number };
export interface EditorialGuidePreview extends GuidePreview {
  sectionId: string;
  author: EditorialDocument["author"];
  coverUrl?: string;
  imageCount: number;
  tags?: string[];
}
export function useEditorialCatalog() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => { setLoading(true); setAttempt(value => value + 1); }, []);
  useEffect(() => {
    let active = true;
    let revision = 0;
    async function load() {
      const request = ++revision;
      try {
        const response = await fetch("/api/content", { cache: "no-store" });
        if (!response.ok) throw new Error("load");
        const result = await response.json();
        if (active && request === revision) { setSummaries(result.summaries); setError(false); }
      } catch { if (active && request === revision) setError(true); }
      finally { if (active && request === revision) setLoading(false); }
    }
    void load();
    window.addEventListener(updatedEvent, load);
    return () => { active = false; window.removeEventListener(updatedEvent, load); };
  }, [attempt]);
  const guides: EditorialGuidePreview[] = guidePreviews.map(guide => {
    const saved = summaries.find(item => item.id === guide.id);
    const defaults = getEditorialDefault(guide.id)!;
    return {
      ...guide,
      sectionId: guide.id,
      title: saved?.title ?? guide.title,
      summary: saved?.summary ?? guide.summary,
      author: saved?.author ?? defaults.author,
      coverUrl: saved?.coverUrl,
      imageCount: saved?.imageCount ?? 0,
      ...(saved?.tags ? { tags: saved.tags } : {}),
    };
  });
  for (const summary of summaries) {
    const section = summary.sectionId ? getGuideSection(summary.sectionId) : undefined;
    if (!section || !isCustomGuideId(summary.id)) continue;
    guides.push({
      id: summary.id, sectionId: section.id, category: section.category,
      title: summary.title, summary: summary.summary, author: summary.author,
      imageCount: summary.imageCount, coverUrl: summary.coverUrl,
      ...(summary.tags ? { tags: summary.tags } : {}),
      keywords: section.keywords, steps: [], status: "general",
    });
  }
  return { guides, loading, error, reload };
}

export function useEditorialGuides(): EditorialGuidePreview[] { return useEditorialCatalog().guides; }

export async function createEditorialGuide(document: EditorialDocument): Promise<EditorialDocument> {
  const staged = await stageEditorial(document);
  const response = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: encodeEditorial(staged) });
  if (!response.ok) throw new Error(response.status === 401 ? "unauthorized" : "save");
  const result = await response.json();
  window.dispatchEvent(new Event(updatedEvent));
  return result.document;
}
