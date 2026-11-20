"use client";

import { useSyncExternalStore } from "react";
import { isPreparationDate } from "./preparation-date";
export { isPreparationDate } from "./preparation-date";
import { preparationItemIds } from "../data/preparation-content";

export type PreparationReminder = { id: string; title: string; date: string; note: string; done: boolean };
export type PreparationDraft = { editingId: string | null; title: string; date: string; note: string };
export type PreparationState = {
  version: 1;
  completed: string[];
  reminders: PreparationReminder[];
  draft: PreparationDraft;
  hydrated: boolean;
  storageUnavailable: boolean;
};
export const PREPARATION_STORAGE_KEY = "studentpath:preparation:v1";
export const MAX_PREPARATION_REMINDERS = 20;
const allowedItems = new Set(preparationItemIds);
const emptyDraft = (): PreparationDraft => ({ editingId: null, title: "", date: "", note: "" });
export function createInitialPreparationState(): PreparationState {
  return { version: 1, completed: [], reminders: [], draft: emptyDraft(), hydrated: false, storageUnavailable: false };
}
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validId(value: unknown): value is string { return typeof value === "string" && /^reminder-[a-z0-9-]{1,100}$/i.test(value); }
function validText(value: unknown, minimum: number, maximum: number): value is string { return typeof value === "string" && value === value.trim() && value.length >= minimum && value.length <= maximum; }

export function localPreparationDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
/** Convert calendar components, not local elapsed hours; DST cannot add or remove a day. */
export function preparationDaysUntil(date: string, today = localPreparationDate()): number | null {
  if (!isPreparationDate(date) || !isPreparationDate(today)) return null;
  const serial = (value: string) => { const [year, month, day] = value.split("-").map(Number); return Date.UTC(year, month - 1, day); };
  return Math.round((serial(date) - serial(today)) / 86400000);
}
function validDraft(value: unknown): value is PreparationDraft {
  return isRecord(value) && (value.editingId === null || validId(value.editingId))
    && typeof value.title === "string" && value.title.length <= 80
    && typeof value.note === "string" && value.note.length <= 240
    && (value.date === "" || isPreparationDate(value.date));
}
function validReminder(value: unknown): value is PreparationReminder {
  return isRecord(value) && validId(value.id) && validText(value.title, 1, 80) && validText(value.note, 0, 240)
    && isPreparationDate(value.date) && typeof value.done === "boolean";
}
export function parsePreparationState(raw: string | null): PreparationState {
  if (raw === null) return { ...createInitialPreparationState(), hydrated: true };
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.completed) || !data.completed.every(id => typeof id === "string" && allowedItems.has(id))
    || !Array.isArray(data.reminders) || data.reminders.length > MAX_PREPARATION_REMINDERS || !data.reminders.every(validReminder) || !validDraft(data.draft)) throw new Error("Invalid StudentPath preparation record");
  const reminders = data.reminders as PreparationReminder[];
  const draft = data.draft;
  if (new Set(reminders.map(item => item.id)).size !== reminders.length || (draft.editingId !== null && !reminders.some(item => item.id === draft.editingId))) throw new Error("Invalid preparation reference");
  return { version: 1, completed: [...new Set(data.completed as string[])], reminders: reminders.map(item => ({ ...item })), draft: { ...draft }, hydrated: true, storageUnavailable: false };
}
export function loadPreparationState(storage: Pick<Storage, "getItem">, fallback = createInitialPreparationState()): PreparationState {
  try { return parsePreparationState(storage.getItem(PREPARATION_STORAGE_KEY)); }
  catch { return { ...fallback, hydrated: true, storageUnavailable: true }; }
}
const initial = createInitialPreparationState();
let current = initial;
let initialized = false;
const listeners = new Set<() => void>();
function notify() { listeners.forEach(listener => listener()); }
function readStorage() {
  if (typeof window === "undefined") return;
  try { current = loadPreparationState(window.localStorage, current); }
  catch { current = { ...current, hydrated: true, storageUnavailable: true }; }
}
function onStorage(event: StorageEvent) {
  if (typeof window === "undefined" || current.storageUnavailable || (event.key !== PREPARATION_STORAGE_KEY && event.key !== null)) return;
  try { if (event.storageArea !== null && event.storageArea !== window.localStorage) return; }
  catch { current = { ...current, storageUnavailable: true, hydrated: true }; notify(); return; }
  readStorage(); notify();
}
function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true; window.addEventListener("storage", onStorage); readStorage(); notify();
}
function subscribe(listener: () => void) { listeners.add(listener); initialize(); return () => { listeners.delete(listener); }; }
function commit(update: (state: PreparationState) => PreparationState) {
  if (typeof window === "undefined") return;
  initialize();
  if (!current.storageUnavailable) readStorage();
  const next = update(current);
  if (next !== current) {
    current = next;
    if (!current.storageUnavailable) {
      try { const { version, completed, reminders, draft } = current; window.localStorage.setItem(PREPARATION_STORAGE_KEY, JSON.stringify({ version, completed, reminders, draft })); }
      catch { current = { ...current, storageUnavailable: true }; }
    }
  }
  notify();
}
export function usePreparationState() { return useSyncExternalStore(subscribe, () => current, () => initial); }
export function togglePreparationItem(id: string) {
  if (!allowedItems.has(id)) return;
  commit(state => ({ ...state, completed: state.completed.includes(id) ? state.completed.filter(item => item !== id) : [...state.completed, id] }));
}
export function updatePreparationDraft(patch: Partial<Omit<PreparationDraft, "editingId">>) {
  commit(state => { const draft = { ...state.draft, ...patch, editingId: state.draft.editingId }; return validDraft(draft) ? { ...state, draft } : state; });
}
export function editPreparationReminder(id: string): boolean {
  let found = false;
  commit(state => { const item = state.reminders.find(reminder => reminder.id === id); if (!item) return state; found = true; return { ...state, draft: { editingId: id, title: item.title, date: item.date, note: item.note } }; });
  return found;
}
export function cancelPreparationDraft() { commit(state => ({ ...state, draft: emptyDraft() })); }
/** Returns an accepted ID. storageUnavailable distinguishes memory-only from durable saving. */
export function savePreparationReminder(): string | null {
  let accepted: string | null = null;
  commit(state => {
    const { editingId, date } = state.draft; const title = state.draft.title.trim(); const note = state.draft.note.trim();
    if (!validText(title, 1, 80) || !validText(note, 0, 240) || !isPreparationDate(date)) return state;
    if (editingId !== null && !state.reminders.some(item => item.id === editingId)) return state;
    if (editingId === null && state.reminders.length >= MAX_PREPARATION_REMINDERS) return state;
    accepted = editingId ?? `reminder-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`}`;
    const reminders = editingId === null ? [...state.reminders, { id: accepted, title, date, note, done: false }] : state.reminders.map(item => item.id === editingId ? { ...item, title, date, note } : item);
    return { ...state, reminders, draft: emptyDraft() };
  });
  return accepted;
}
export function togglePreparationReminder(id: string) { commit(state => state.reminders.some(item => item.id === id) ? { ...state, reminders: state.reminders.map(item => item.id === id ? { ...item, done: !item.done } : item) } : state); }
export function deletePreparationReminder(id: string): boolean {
  let removed = false;
  commit(state => { if (!state.reminders.some(item => item.id === id)) return state; removed = true; return { ...state, reminders: state.reminders.filter(item => item.id !== id), draft: state.draft.editingId === id ? emptyDraft() : state.draft }; });
  return removed;
}
