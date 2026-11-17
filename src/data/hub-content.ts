import type { LocalizedText } from "./home-content";

export type HubEntryId = "essentials" | "guides" | "community";
export type HubEntry = {
  id: HubEntryId;
  title: LocalizedText;
  description: LocalizedText;
  action: LocalizedText;
};
export type HubContent = {
  version: 1;
  id: "dashboard";
  eyebrow: LocalizedText;
  title: LocalizedText;
  highlight: LocalizedText;
  description: LocalizedText;
  entries: HubEntry[];
};

const text = (zh: string, ru: string): LocalizedText => ({ zh, ru });

export const hubContentDefault: HubContent = {
  version: 1,
  id: "dashboard",
  eyebrow: text("MOSCOW / STUDENT LIFE", "MOSCOW / STUDENT LIFE"),
  title: text("新的生活，", "Новая жизнь."),
  highlight: text("慢慢来，就好。", "В своём темпе."),
  description: text("欢迎来到 StudentPath。今天，想从哪里开始？", "Добро пожаловать в StudentPath. С чего начнём сегодня?"),
  entries: [
    { id: "essentials", title: text("入学必看", "С чего начать"), description: text("入学安排、所需材料与办理地点。", "Порядок поступления, документы и адреса."), action: text("打开入学须知", "Открыть памятку") },
    { id: "guides", title: text("办事指南", "Инструкции"), description: text("有事要办时，找到清楚的步骤。", "Понятные шаги для конкретных дел."), action: text("查找指南", "Найти инструкцию") },
    { id: "community", title: text("留学社区", "Сообщество"), description: text("逛逛日常，聊聊留学生活。", "Заметки, вопросы и студенческие будни."), action: text("去逛一逛", "Заглянуть") },
  ],
};
