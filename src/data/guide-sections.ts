import { guidePreviews, type GuidePreview } from "./home-content";
import type { EditorialDocument, EditorialStep } from "./editorial-content";

export type GuideSection = Pick<GuidePreview, "id" | "category" | "title" | "summary" | "keywords">;

// Sections can exist independently of articles; the original seven keep their IDs.
export const guideSections: GuideSection[] = [
  ...guidePreviews.map(({ id, category, title, summary, keywords }) => ({ id, category, title, summary, keywords })),
  {
    id: "housing",
    category: "living",
    title: { zh: "宿舍与住宿", ru: "Общежития и жильё" },
    summary: {
      zh: "认识宿舍、查看地址，整理入住与日常住宿经验。",
      ru: "Общежития, адреса, заселение и повседневная жизнь в новом доме.",
    },
    keywords: ["宿舍", "住宿", "入住", "莫大宿舍", "общежитие", "общежития", "жильё", "заселение", "МГУ"],
  },
];
export function getGuideSection(id: string) { return guideSections.find(section => section.id === id); }
export function isCustomGuideId(id: string) {
  return /^guide-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
export function newGuideStep(): EditorialStep {
  return { id: `step-${crypto.randomUUID()}`, legacyIndex: 0, title: { zh: "", ru: "" }, description: { zh: "", ru: "" }, materials: [], images: [], sources: [] };
}
export function createGuideDraft(sectionId: string): EditorialDocument {
  return {
    version: 1, id: "new-guide", sectionId, title: { zh: "", ru: "" }, summary: { zh: "", ru: "" },
    author: { name: { zh: "StudentPath", ru: "StudentPath" }, role: { zh: "", ru: "" } },
    images: [], steps: [newGuideStep()], sources: [],
  };
}
