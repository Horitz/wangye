import { getEditorialDefault } from "../data/editorial-content";
import { preparationGroups } from "../data/preparation-content";
import { HOME_STORAGE_KEY, LEGACY_HOME_STORAGE_KEY, parseStoredState } from "./home-store";
import { parsePreparationState, PREPARATION_STORAGE_KEY } from "./preparation-store";
import { createInitialPersonalPlan, withDocumentInPlan, withToggledPlanTask, parsePersonalPlan, serializePersonalPlan, PERSONAL_PLAN_STORAGE_KEY, type PersonalPlanState } from "./personal-plan-data";
export * from "./personal-plan-data";

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
