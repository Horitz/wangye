import { guidePreviews, type LocalizedText } from "./home-content";
import { getGuideReaderContent, type GuideReaderSource } from "./guide-reader-content";
import type { GuideMediaImage } from "@/lib/guide-media-store";

export type EditorialStep = {
  id: string;
  legacyIndex: 0 | 1 | 2;
  title: LocalizedText;
  description: LocalizedText;
  materials: LocalizedText[];
  place?: LocalizedText;
  address?: LocalizedText;
  requirements?: LocalizedText;
  images: GuideMediaImage[];
  sources: GuideReaderSource[];
};

export type EditorialDocument = {
  version: 1;
  id: string;
  sectionId?: string;
  tags?: string[];
  title: LocalizedText;
  summary: LocalizedText;
  author: { name: LocalizedText; role: LocalizedText };
  images: GuideMediaImage[];
  steps: EditorialStep[];
  sources: GuideReaderSource[];
};

const text = (zh: string, ru: string): LocalizedText => ({ zh, ru });
const essentials: EditorialDocument = {
  version: 1,
  id: "essentials",
  title: text("先了解，再出发。", "Сначала разобраться. Потом в путь."),
  summary: text("从这三件事开始准备。", "Начните с этих трёх шагов."),
  author: { name: text("StudentPath", "StudentPath"), role: text("编辑整理", "Редакция") },
  images: [],
  sources: [],
  steps: [
    { id: "school", legacyIndex: 0, title: text("确认入学安排", "Уточните порядок поступления"), description: text("确认报到的时间、地点与联系方式，把重要日期记下来。", "Уточните время, место и контакты для оформления. Запишите важные даты."), materials: [], images: [], sources: [] },
    { id: "documents", legacyIndex: 1, title: text("整理所需材料", "Подготовьте документы"), description: text("取得学校的材料清单，按原件、复印件和翻译件分别准备。", "Получите список документов в вузе. Подготовьте оригиналы, копии и переводы по этому списку."), materials: [], images: [], sources: [] },
    { id: "arrival", legacyIndex: 2, title: text("安排抵达后的生活", "Спланируйте первые дни"), description: text("确认入住与交通，给第一周的生活留一点余地。", "Уточните заселение и транспорт. Оставьте время освоиться в первую неделю."), materials: [], images: [], sources: [] },
  ],
};

const defaults: Record<string, EditorialDocument> = Object.fromEntries(guidePreviews.map(guide => {
  const reader = getGuideReaderContent(guide);
  return [guide.id, {
    version: 1, id: guide.id, title: guide.title, summary: guide.summary,
    author: { name: reader.author.name, role: text("编辑整理", "Редакция") },
    images: [],
    steps: reader.steps.map(step => ({ id: step.id, legacyIndex: step.legacyIndex, title: step.title, description: step.description, materials: step.materials, images: [], sources: step.sources ?? [] })),
    sources: guide.sourceUrl ? [{ label: guide.sourceLabel ?? text("来源", "Источник"), url: guide.sourceUrl }] : [],
  } satisfies EditorialDocument];
}));
defaults.essentials = essentials;

export const editorialIds = Object.keys(defaults);
export function getEditorialDefault(id: string): EditorialDocument | undefined { return defaults[id]; }
