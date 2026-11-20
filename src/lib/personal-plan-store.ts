"use client";

import { useSyncExternalStore } from "react";
import type { EditorialDocument } from "../data/editorial-content";
import { socialRequest } from "./social-client";
import {
  createInitialPersonalPlan, parsePersonalPlan, serializePersonalPlan,
  withDocumentInPlan, withToggledPlanTask, withSavedPlanTask, withDeletedPlanTask,
  type PersonalPlanState, type PlanTaskInput,
} from "./personal-plan-data";

export type { PersonalPlanState, PlanTask, PlanGroup, PlanTaskInput } from "./personal-plan-data";
type Snapshot = PersonalPlanState & { saving: boolean; error: "read" | "write" | "conflict" | null };
type Reply = { revision: number; plan: unknown };

const initial: Snapshot = { ...createInitialPersonalPlan(), saving: false, error: null };
let current = initial;
let owner: string | null | undefined;
let revision = 0;
let generation = 0;
const listeners = new Set<() => void>();

function update(patch: Partial<Snapshot>) {
  current = { ...current, ...patch };
  listeners.forEach(listener => listener());
}
function accept(result: Reply) {
  const state = result.plan === null ? createInitialPersonalPlan() : parsePersonalPlan(JSON.stringify(result.plan));
  revision = result.revision;
  update({ ...state, hydrated: true, saving: false, error: null });
}
export async function refreshPersonalPlan() {
  if (!owner || current.saving) return;
  const version = ++generation;
  try {
    const result = await socialRequest<Reply>("plan", {}, owner);
    if (version === generation) accept(result);
  } catch {
    if (version === generation) update({ error: "read" });
  }
}
export function setPersonalPlanOwner(id: string | null | undefined) {
  if (owner === id) return;
  generation++;
  revision = 0;
  owner = id;
  update({ ...initial, hydrated: id === null });
  if (id && listeners.size) void refreshPersonalPlan();
}
function onFocus() { if (!document.hidden) void refreshPersonalPlan(); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refreshPersonalPlan();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    }
  };
}
export function usePersonalPlan() { return useSyncExternalStore(subscribe, () => current, () => initial); }

async function commit(change: (state: PersonalPlanState) => PersonalPlanState) {
  if (!owner || !current.hydrated || current.saving || current.error === "read") return false;
  const next = change(current);
  if (next === current) return true;
  const version = ++generation;
  update({ saving: true, error: null });
  try {
    const result = await socialRequest<Reply>("plan", {
      method: "PUT", body: JSON.stringify({ revision, plan: JSON.parse(serializePersonalPlan(next)) }),
    }, owner);
    if (generation !== version) return false;
    accept(result);
    return true;
  } catch (error) {
    if (generation === version) {
      const code = error instanceof Error && error.message === "plan_changed" ? "conflict" : "write";
      update({ saving: false });
      await refreshPersonalPlan();
      if (generation === version + 1 && !current.error) {
        // The write may have succeeded even if its response was lost.
        if (serializePersonalPlan(current) === serializePersonalPlan(next)) return true;
        update({ error: code });
      }
    }
    return false;
  }
}
export function addDocumentToPlan(document: EditorialDocument) { return commit(state => withDocumentInPlan(state, document)); }
export function togglePlanTask(groupId: string, taskId: string) { return commit(state => withToggledPlanTask(state, groupId, taskId)); }
export function savePlanTask(groupId: string, task: PlanTaskInput, clearDraft = false) {
  return commit(state => {
    const next = withSavedPlanTask(state, groupId, task, task.id ?? `task-${crypto.randomUUID()}`);
    return clearDraft ? { ...next, recoveredDraft: undefined } : next;
  });
}
export function deletePlanTask(groupId: string, taskId: string) { return commit(state => withDeletedPlanTask(state, groupId, taskId)); }
