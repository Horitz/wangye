import { getEditorialDefault, type EditorialDocument } from "../data/editorial-content";
import { isCustomGuideId } from "../data/guide-sections";
import type { LocalizedText } from "../data/home-content";
import { preparationGroups } from "../data/preparation-content";
import { HOME_STORAGE_KEY, LEGACY_HOME_STORAGE_KEY, parseStoredState } from "./home-store";
import { isPreparationDate, parsePreparationState, PREPARATION_STORAGE_KEY } from "./preparation-store";

export type PlanTask = {
  id: string;
  title: LocalizedText;
  sourceStepId?: string;
  done: boolean;
  date: string;
  note: string;
};
export type PlanGroup = { id: string; sourceId?: string; title: LocalizedText; tasks: PlanTask[] };
export type PlanTaskInput = { id?: string; title: LocalizedText; date: string; note: string };
export type PersonalPlanState = {
  version: 1;
  groups: PlanGroup[];
  recoveredDraft?: PlanTaskInput;
  hydrated: boolean;
  storageUnavailable: boolean;
};
export const PERSONAL_PLAN_STORAGE_KEY = "studentpath:personal-plan:v1";
export function createInitialPersonalPlan(): PersonalPlanState {
  return { version: 1, groups: [], hydrated: false, storageUnavailable: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{1,160}$/i.test(value);
}
function validTitle(value: unknown): value is LocalizedText {
  return isRecord(value) && [value.zh, value.ru].every(text => typeof text === "string" && text.trim().length > 0 && text.length <= 160);
}
function validTaskInput(value: unknown): value is PlanTaskInput {
  return isRecord(value) && (value.id === undefined || validId(value.id)) && validTitle(value.title)
    && (value.date === "" || isPreparationDate(value.date)) && typeof value.note === "string" && value.note.length <= 4000;
}
function validTask(value: unknown): value is PlanTask {
  if (!isRecord(value)) return false;
  const { done, sourceStepId } = value;
  return validTaskInput(value) && validId(value.id) && typeof done === "boolean"
    && (sourceStepId === undefined || validId(sourceStepId));
}
function validGroup(value: unknown): value is PlanGroup {
  if (!isRecord(value) || !validId(value.id) || !validTitle(value.title) || !Array.isArray(value.tasks)
    || !value.tasks.every(validTask) || new Set(value.tasks.map(task => task.id)).size !== value.tasks.length) return false;
  if (value.sourceId === undefined) return value.tasks.every(task => task.sourceStepId === undefined);
  if (typeof value.sourceId !== "string" || value.id !== value.sourceId) return false;
  // Published custom guides can change; personal tasks retain their saved step snapshots.
  if (isCustomGuideId(value.sourceId)) return true;
  const source = getEditorialDefault(value.sourceId);
  return Boolean(source && value.tasks.every(task => task.sourceStepId === undefined || source.steps.some(step => step.id === task.sourceStepId)));
}

export function serializePersonalPlan(state: PersonalPlanState): string {
  return JSON.stringify({ version: state.version, groups: state.groups, recoveredDraft: state.recoveredDraft });
}
export function parsePersonalPlan(raw: string): PersonalPlanState {
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.groups) || !data.groups.every(validGroup)
    || new Set(data.groups.map(group => group.id)).size !== data.groups.length
    || (data.recoveredDraft !== undefined && !validRecoveredDraft(data.recoveredDraft))) throw new Error("Invalid StudentPath personal plan");
  return { version: 1, groups: data.groups, ...(data.recoveredDraft ? { recoveredDraft: data.recoveredDraft } : {}), hydrated: true, storageUnavailable: false };
}
function validRecoveredDraft(value: unknown): value is PlanTaskInput {
  return isRecord(value) && (value.id === undefined || validId(value.id)) && isRecord(value.title)
    && [value.title.zh, value.title.ru].every(text => typeof text === "string" && text.length <= 160)
    && (value.date === "" || isPreparationDate(value.date)) && typeof value.note === "string" && value.note.length <= 4000;
}

export function withDocumentInPlan(state: PersonalPlanState, document: EditorialDocument): PersonalPlanState {
  if (state.groups.some(group => group.id === document.id)) return state;
  const group: PlanGroup = {
    id: document.id, sourceId: document.id, title: { ...document.title },
    tasks: document.steps.map(step => ({ id: step.id, sourceStepId: step.id, title: { ...step.title }, done: false, date: "", note: "" })),
  };
  return { ...state, groups: [...state.groups, group] };
}
export function withToggledPlanTask(state: PersonalPlanState, groupId: string, taskId: string): PersonalPlanState {
  if (!state.groups.some(group => group.id === groupId && group.tasks.some(task => task.id === taskId))) return state;
  return { ...state, groups: state.groups.map(group => group.id === groupId ? { ...group, tasks: group.tasks.map(task => task.id === taskId ? { ...task, done: !task.done } : task) } : group) };
}
export function withSavedPlanTask(state: PersonalPlanState, groupId: string, input: PlanTaskInput, newId: string): PersonalPlanState {
  const normalized = { ...input, title: { zh: input.title.zh.trim(), ru: input.title.ru.trim() }, note: input.note.trim() };
  if (!validTaskInput(normalized) || (!input.id && !validId(newId))) return state;
  let groups = state.groups;
  if (!groups.some(group => group.id === groupId)) {
    if (groupId !== "personal" || input.id) return state;
    groups = [...groups, { id: "personal", title: { zh: "个人安排", ru: "Личные планы" }, tasks: [] }];
  }
  const target = groups.find(group => group.id === groupId)!;
  if (input.id && !target.tasks.some(task => task.id === input.id)) return state;
  if (!input.id && target.tasks.some(task => task.id === newId)) return state;
  return {
    ...state,
    groups: groups.map(group => group.id !== groupId ? group : {
      ...group,
      tasks: input.id ? group.tasks.map(task => task.id === input.id ? { ...task, ...normalized, id: task.id } : task)
        : [...group.tasks, { ...normalized, id: newId, done: false }],
    }),
  };
}
export function withDeletedPlanTask(state: PersonalPlanState, groupId: string, taskId: string): PersonalPlanState {
  if (!state.groups.some(group => group.id === groupId && group.tasks.some(task => task.id === taskId))) return state;
  return { ...state, groups: state.groups.map(group => group.id === groupId ? { ...group, tasks: group.tasks.filter(task => task.id !== taskId) } : group) };
}

/** Copy only actual old work; untouched starter lists do not populate a new user's plan. */
export function migrateLegacyPersonalPlan(storage: Pick<Storage, "getItem">): PersonalPlanState {
  let state: PersonalPlanState = { ...createInitialPersonalPlan(), hydrated: true };
  try {
    const home = parseStoredState(storage.getItem(HOME_STORAGE_KEY) ?? storage.getItem(LEGACY_HOME_STORAGE_KEY));
    for (const [sourceId, completed] of Object.entries(home.completed)) {
      const document = getEditorialDefault(sourceId);
      if (!document || !document.steps.some(step => completed.includes(step.legacyIndex))) continue;
      state = withDocumentInPlan(state, document);
      for (const step of document.steps) if (completed.includes(step.legacyIndex)) state = withToggledPlanTask(state, sourceId, step.id);
    }
  } catch { state = { ...state, storageUnavailable: true }; }
  try {
    const preparation = parsePreparationState(storage.getItem(PREPARATION_STORAGE_KEY));
    if (preparation.completed.length) state.groups.push({
      id: "legacy-preparation", title: { zh: "我的准备事项", ru: "Моя подготовка" },
      tasks: preparationGroups.flatMap(group => group.items.map(item => ({ id: item.id, title: { ...item.title }, done: preparation.completed.includes(item.id), date: "", note: "" }))),
    });
    if (preparation.reminders.length) state.groups.push({
      id: "personal", title: { zh: "个人安排", ru: "Личные планы" },
      tasks: preparation.reminders.map(item => ({ ...item, title: { zh: item.title, ru: item.title } })),
    });
    const draft = preparation.draft;
    if (draft.title || draft.date || draft.note || draft.editingId) state.recoveredDraft = {
      ...(draft.editingId ? { id: draft.editingId } : {}), title: { zh: draft.title, ru: draft.title }, date: draft.date, note: draft.note,
    };
  } catch { state = { ...state, storageUnavailable: true }; }
  return state;
}

/** Old keys remain untouched. A new key prevents repeated imports after completion is undone. */
export function loadPersonalPlan(storage: Pick<Storage, "getItem" | "setItem">, fallback = createInitialPersonalPlan()): PersonalPlanState {
  let loaded = fallback;
  try {
    const raw = storage.getItem(PERSONAL_PLAN_STORAGE_KEY);
    if (raw !== null) return parsePersonalPlan(raw);
    loaded = migrateLegacyPersonalPlan(storage);
    if (!loaded.storageUnavailable) storage.setItem(PERSONAL_PLAN_STORAGE_KEY, serializePersonalPlan(loaded));
    return loaded;
  } catch { return { ...loaded, hydrated: true, storageUnavailable: true }; }
}
