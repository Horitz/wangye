import type { DegreeLevel, Stage } from "../lib/home-store";

export const stageOptions: { id: Stage; label: { zh: string; ru: string } }[] = [
  { id: "prospective", label: { zh: "准备申请", ru: "Готовлюсь к поступлению" } },
  { id: "newArrival", label: { zh: "刚刚抵达", ru: "Недавно приехал" } },
  { id: "enrolled", label: { zh: "正在就读", ru: "Уже учусь" } },
];
export const degreeOptions: { id: DegreeLevel; label: { zh: string; ru: string } }[] = [
  { id: "unknown", label: { zh: "暂不选择", ru: "Пока не выбираю" } },
  { id: "preparatory", label: { zh: "预科", ru: "Подготовительная программа" } },
  { id: "bachelor", label: { zh: "本科", ru: "Бакалавриат" } },
  { id: "master", label: { zh: "硕士", ru: "Магистратура" } },
  { id: "postgraduate", label: { zh: "研究生培养（博士阶段）", ru: "Аспирантура" } },
];

/** Names and university affiliation only; no faculty-specific requirements are inferred. */
export const facultyOptions = [
  { id: "physics", university: "msu" as const, label: { zh: "物理学系", ru: "Физический факультет" }, sourceUrl: "https://www.phys.msu.ru/", checkedAt: "2026-11-16" },
  { id: "economics", university: "msu" as const, label: { zh: "经济学系", ru: "Экономический факультет" }, sourceUrl: "https://www.econ.msu.ru/", checkedAt: "2026-11-16" },
  { id: "journalism", university: "msu" as const, label: { zh: "新闻学系", ru: "Факультет журналистики" }, sourceUrl: "https://www.journ.msu.ru/", checkedAt: "2026-11-16" },
];
export const interestOptions = [
  { id: "documents", label: { zh: "证件与签证", ru: "Документы и виза" } },
  { id: "study", label: { zh: "入学与学习", ru: "Поступление и учёба" } },
  { id: "health", label: { zh: "医疗与保险", ru: "Медицина и страховка" } },
  { id: "banking", label: { zh: "银行与支付", ru: "Банки и платежи" } },
  { id: "living", label: { zh: "住宿与生活", ru: "Проживание и быт" } },
  { id: "transport", label: { zh: "交通与城市", ru: "Транспорт и город" } },
];
