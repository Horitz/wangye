"use client";

import { useSyncExternalStore } from "react";
import type { EditorialDocument } from "../data/editorial-content";
import {
  createInitialPersonalPlan, loadPersonalPlan, PERSONAL_PLAN_STORAGE_KEY, serializePersonalPlan,
  withDocumentInPlan, withToggledPlanTask, withSavedPlanTask, withDeletedPlanTask,
  type PersonalPlanState, type PlanTaskInput,
} from "./personal-plan-model";

export type { PersonalPlanState, PlanTask, PlanGroup, PlanTaskInput } from "./personal-plan-model";
export { PERSONAL_PLAN_STORAGE_KEY } from "./personal-plan-model";

const initial = createInitialPersonalPlan();
let current = initial;
let initialized = false;
const listeners = new Set<() => void>();
function notify() { listeners.forEach(listener => listener()); }
function readStorage() {
  try { current = loadPersonalPlan(window.localStorage, current); }
  catch { current = { ...current, hydrated: true, storageUnavailable: true }; }
}
function onStorage(event: StorageEvent) {
  if (current.storageUnavailable || (event.key !== PERSONAL_PLAN_STORAGE_KEY && event.key !== null)) return;
  try { if (event.storageArea !== null && event.storageArea !== window.localStorage) return; }
  catch { current = { ...current, hydrated: true, storageUnavailable: true }; notify(); return; }
  readStorage(); notify();
}
function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("storage", onStorage);
  readStorage(); notify();
}
function subscribe(listener: () => void) { listeners.add(listener); initialize(); return () => { listeners.delete(listener); }; }
function commit(update: (state: PersonalPlanState) => PersonalPlanState) {
  if (typeof window === "undefined") return;
  initialize();
  if (!current.storageUnavailable) readStorage();
  const next = update(current);
  if (next !== current) {
    current = next;
    if (!current.storageUnavailable) {
      try { window.localStorage.setItem(PERSONAL_PLAN_STORAGE_KEY, serializePersonalPlan(current)); }
      catch { current = { ...current, storageUnavailable: true }; }
    }
  }
  notify();
}
export function usePersonalPlan() { return useSyncExternalStore(subscribe, () => current, () => initial); }
export function addDocumentToPlan(document: EditorialDocument) { commit(state => withDocumentInPlan(state, document)); }
export function togglePlanTask(groupId: string, taskId: string) { commit(state => withToggledPlanTask(state, groupId, taskId)); }
export function savePlanTask(groupId: string, task: PlanTaskInput) {
  commit(state => withSavedPlanTask(state, groupId, task, task.id ?? `task-${crypto.randomUUID()}`));
}
export function deletePlanTask(groupId: string, taskId: string) { commit(state => withDeletedPlanTask(state, groupId, taskId)); }
export function clearRecoveredPlanDraft() {
  commit(state => state.recoveredDraft ? { ...state, recoveredDraft: undefined } : state);
}
