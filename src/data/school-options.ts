export type SchoolId = "msu" | "hse" | "rudn" | "other";
export type SchoolOption = {
  id: SchoolId;
  label: { zh: string; ru: string };
  shortLabel: { zh: string; ru: string };
  sourceUrl: string | null;
  checkedAt: string | null;
  keywords: string;
};

/** Names only, checked against official institution pages. No policy equivalence is implied. */
export const schoolOptions: SchoolOption[] = [
  { id: "msu", label: { zh: "莫斯科国立大学", ru: "МГУ имени М. В. Ломоносова" }, shortLabel: { zh: "莫斯科国立大学", ru: "МГУ" }, sourceUrl: "https://www.msu.ru/", checkedAt: "2026-11-16", keywords: "msu mgu мгу московский государственный университет ломоносова 莫大 莫斯科国立大学" },
  { id: "hse", label: { zh: "高等经济大学", ru: "НИУ «Высшая школа экономики»" }, shortLabel: { zh: "高等经济大学", ru: "НИУ ВШЭ" }, sourceUrl: "https://www.hse.ru/sveden/common", checkedAt: "2026-11-16", keywords: "hse вшэ ниу высшая школа экономики 高经 高等经济大学" },
  { id: "rudn", label: { zh: "俄罗斯人民友谊大学", ru: "РУДН имени Патриса Лумумбы" }, shortLabel: { zh: "俄罗斯人民友谊大学", ru: "РУДН" }, sourceUrl: "https://www.rudn.ru/sveden/common/", checkedAt: "2026-11-16", keywords: "rudn рудн российский университет дружбы народов лумумбы 友大 俄罗斯人民友谊大学" },
  { id: "other", label: { zh: "其他学校／还不确定", ru: "Другой вуз / пока не знаю" }, shortLabel: { zh: "其他学校", ru: "Другие вузы" }, sourceUrl: null, checkedAt: null, keywords: "other другая другой вуз пока не знаю 其他学校 还不确定" },
];

export function isSchoolId(value: unknown): value is SchoolId {
  return typeof value === "string" && schoolOptions.some(school => school.id === value);
}

export function getSchool(id: SchoolId): SchoolOption {
  return schoolOptions.find(school => school.id === id)!;
}
