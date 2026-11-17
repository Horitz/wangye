import type { LocalizedText } from "./home-content";

export type PreparationGroup = {
  id: "before" | "arrival" | "daily";
  title: LocalizedText;
  guideId: string;
  guideTitle: LocalizedText;
  items: { id: string; title: LocalizedText }[];
};

/** Personal planning prompts, never an official list of required documents. */
export const preparationGroups: PreparationGroup[] = [
  { id: "before", title: { zh: "出发前的准备", ru: "Перед поездкой" }, guideId: "university-admission", guideTitle: { zh: "参考：入学流程概览", ru: "Обзор поступления" }, items: [
    { id: "before-questions", title: { zh: "写下想向学校确认的问题", ru: "Записать вопросы, которые хочется уточнить у вуза" } },
    { id: "before-contacts", title: { zh: "保存学校公开的联系入口", ru: "Сохранить официальные контакты вуза" } },
    { id: "before-materials", title: { zh: "根据学校回复整理自己的材料目录", ru: "Составить свой список документов по ответу вуза" } },
  ] },
  { id: "arrival", title: { zh: "初到新环境", ru: "В новом месте" }, guideId: "first-week", guideTitle: { zh: "参考：抵达后的第一周", ru: "Обзор первой недели" }, items: [
    { id: "arrival-stay", title: { zh: "记下自己需要确认的住宿安排", ru: "Записать, что нужно уточнить о проживании" } },
    { id: "arrival-next", title: { zh: "列出目前最想完成的三件小事", ru: "Выбрать три небольших дела на первое время" } },
    { id: "arrival-dates", title: { zh: "将已确认的安排记入自己的日历", ru: "Внести подтверждённые планы в свой календарь" } },
  ] },
  { id: "daily", title: { zh: "找到生活节奏", ru: "Свой ритм жизни" }, guideId: "public-transport", guideTitle: { zh: "参考：城市出行概览", ru: "Обзор городского транспорта" }, items: [
    { id: "daily-route", title: { zh: "了解一次自己常用的出行路线", ru: "Познакомиться с маршрутом для обычных поездок" } },
    { id: "daily-study", title: { zh: "为学习和休息留出各自的时间", ru: "Выделить время на учёбу и отдых" } },
    { id: "daily-review", title: { zh: "回看待办，调整下一步安排", ru: "Пересмотреть список дел и выбрать следующий шаг" } },
  ] },
];

export const preparationItemIds = preparationGroups.flatMap(group => group.items.map(item => item.id));
