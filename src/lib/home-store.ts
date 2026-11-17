"use client";

import { useSyncExternalStore } from "react";
import { facultyOptions, interestOptions } from "../data/profile-options";
import { isSchoolId, type SchoolId } from "../data/school-options";

export type Locale = "zh" | "ru";
export type Stage = "prospective" | "newArrival" | "enrolled";
export type University = SchoolId;
export type DegreeLevel = "unknown" | "preparatory" | "bachelor" | "master" | "postgraduate";
export type ProfileDraft = {
  university: University | null;
  stage: Stage | null;
  faculty: string;
  degreeLevel: DegreeLevel;
  interests: string[];
  cityId: "moscow";
};
type ProfileSnapshot = ProfileDraft & {
  university: University;
  stage: Stage;
  profileSet: boolean;
  onboardingDraft: ProfileDraft | null;
};
type ProfileScope = {
  ownerId: string | null;
  guest: ProfileSnapshot;
  drafts: Record<string, ProfileDraft>;
};
export type HomeState = {
  schemaVersion: 2;
  locale: Locale;
  stage: Stage;
  university: University;
  profileSet: boolean;
  faculty: string;
  degreeLevel: DegreeLevel;
  interests: string[];
  cityId: "moscow";
  onboardingDraft: ProfileDraft | null;
  profileScope?: ProfileScope;
  saved: string[];
  completed: Record<string, number[]>;
  storageUnavailable: boolean;
};

export const HOME_STORAGE_KEY = "studentpath:home:v2";
export const LEGACY_HOME_STORAGE_KEY = "studentpath:home:v1";
const stages = new Set(["prospective", "newArrival", "enrolled"]);
const degrees = new Set(["unknown", "preparatory", "bachelor", "master", "postgraduate"]);
const interests = new Set(interestOptions.map(option => option.id));
const emptyProfile = (): ProfileDraft => ({ university: null, stage: null, faculty: "", degreeLevel: "unknown", interests: [], cityId: "moscow" });

export function createInitialHomeState(): HomeState {
  return { schemaVersion: 2, locale: "zh", stage: "enrolled", university: "msu", profileSet: false, faculty: "", degreeLevel: "unknown", interests: [], cityId: "moscow", onboardingDraft: null, saved: [], completed: {}, storageUnavailable: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function facultyBelongs(university: unknown, faculty: unknown): boolean {
  return faculty === "" || (typeof faculty === "string" && facultyOptions.some(option => option.id === faculty && option.university === university));
}

function validProfile(value: unknown, allowEmpty: boolean): value is ProfileDraft {
  if (!isRecord(value)) return false;
  return (isSchoolId(value.university) || (allowEmpty && value.university === null))
    && (typeof value.stage === "string" && stages.has(value.stage) || (allowEmpty && value.stage === null))
    && typeof value.faculty === "string" && facultyBelongs(value.university, value.faculty)
    && typeof value.degreeLevel === "string" && degrees.has(value.degreeLevel)
    && value.cityId === "moscow" && Array.isArray(value.interests)
    && value.interests.every(id => typeof id === "string" && interests.has(id));
}

function copyProfile(value: ProfileDraft): ProfileDraft {
  return { university: value.university, stage: value.stage, faculty: value.faculty, degreeLevel: value.degreeLevel, interests: [...new Set(value.interests)], cityId: value.cityId };
}

function profileSnapshot(value: ProfileSnapshot): ProfileSnapshot {
  return { ...copyProfile(value), university: value.university, stage: value.stage, profileSet: value.profileSet, onboardingDraft: value.onboardingDraft ? copyProfile(value.onboardingDraft) : null };
}

function validMemberId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
}

function parseProfileScope(value: unknown): ProfileScope {
  if (!isRecord(value) || (value.ownerId !== null && !validMemberId(value.ownerId))
    || !isRecord(value.guest) || typeof value.guest.profileSet !== "boolean"
    || (value.guest.onboardingDraft !== null && !validProfile(value.guest.onboardingDraft, true))
    || !validProfile(value.guest, false)
    || !isRecord(value.drafts) || !Object.entries(value.drafts).every(([id, draft]) => validMemberId(id) && validProfile(draft, true))) {
    throw new Error("Invalid StudentPath profile scope");
  }
  return { ownerId: value.ownerId, guest: profileSnapshot(value.guest as ProfileSnapshot), drafts: Object.fromEntries(Object.entries(value.drafts).map(([id, draft]) => [id, copyProfile(draft as ProfileDraft)])) };
}

/** Parse v1/v2 records without dropping saved guides or completion marks. Throws on corruption. */
export function parseStoredState(raw: string | null): HomeState {
  if (raw === null) return createInitialHomeState();
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data) || ![1, 2].includes(data.schemaVersion as number)
    || !["zh", "ru"].includes(data.locale as string) || !stages.has(data.stage as string)
    || !isSchoolId(data.university) || typeof data.profileSet !== "boolean"
    || !Array.isArray(data.saved) || !data.saved.every(id => typeof id === "string")
    || !isRecord(data.completed) || !Object.values(data.completed).every(items => Array.isArray(items) && items.every(item => Number.isInteger(item) && item >= 0 && item < 3))) {
    throw new Error("Invalid StudentPath state");
  }
  const state: HomeState = {
    ...createInitialHomeState(), locale: data.locale as Locale, stage: data.stage as Stage,
    university: data.university as University, profileSet: data.profileSet,
    saved: [...new Set(data.saved as string[])],
    completed: Object.fromEntries(Object.entries(data.completed).map(([id, items]) => [id, [...new Set(items as number[])]])),
  };
  if (data.schemaVersion === 2) {
    const draft = data.onboardingDraft;
    if (!validProfile(data, false) || (draft !== null && !validProfile(draft, true))) throw new Error("Invalid StudentPath profile");
    state.faculty = data.faculty;
    state.degreeLevel = data.degreeLevel;
    state.interests = [...new Set(data.interests)];
    state.onboardingDraft = draft === null ? null : { ...draft, interests: [...new Set(draft.interests)] };
    if (Object.hasOwn(data, "profileScope")) state.profileScope = parseProfileScope((data as Record<string, unknown>).profileScope);
  }
  return state;
}

export function getProfileDraft(state: HomeState): ProfileDraft {
  if (state.onboardingDraft) return state.onboardingDraft;
  if (!state.profileSet) return emptyProfile();
  return { university: state.university, stage: state.stage, faculty: state.faculty, degreeLevel: state.degreeLevel, interests: [...state.interests], cityId: state.cityId };
}

export function withProfileDraft(state: HomeState, patch: Partial<ProfileDraft>): HomeState {
  const draft = { ...getProfileDraft(state), ...patch };
  if (!facultyBelongs(draft.university, draft.faculty)) draft.faculty = "";
  if (!validProfile(draft, true)) throw new Error("Invalid profile selection");
  return { ...state, onboardingDraft: { ...draft, interests: [...new Set(draft.interests)] } };
}

export function withSavedProfile(state: HomeState): HomeState | null {
  const draft = getProfileDraft(state);
  if (!validProfile(draft, false)) return null;
  return { ...state, ...draft, university: draft.university as University, stage: draft.stage as Stage, interests: [...draft.interests], profileSet: true, onboardingDraft: null };
}

export function withResetProfile(state: HomeState): HomeState {
  const defaults = createInitialHomeState();
  return { ...state, university: defaults.university, stage: defaults.stage, faculty: "", degreeLevel: "unknown", interests: [], cityId: "moscow", profileSet: false, onboardingDraft: null };
}

/** Project a verified member profile without moving browser records between identities. */
export function withMemberProfile(state: HomeState, userId: string | null, profile: ProfileDraft | null, { clearDraft = false }: { clearDraft?: boolean } = {}): HomeState {
  if (userId !== null && !validMemberId(userId)) throw new Error("Invalid member identity");
  if (profile !== null && !validProfile(profile, false)) throw new Error("Invalid member profile");
  const previous = state.profileScope;
  if (userId === null && (!previous || previous.ownerId === null)) return state;

  const switching = previous?.ownerId !== userId;
  const drafts = { ...previous?.drafts };
  if (switching && previous?.ownerId) {
    if (state.onboardingDraft) drafts[previous.ownerId] = copyProfile(state.onboardingDraft);
    else delete drafts[previous.ownerId];
  }
  const guest = previous?.ownerId ? previous.guest : profileSnapshot(state);
  if (userId === null) return { ...state, ...profileSnapshot(guest), profileScope: { ownerId: null, guest, drafts } };

  const saved: ProfileSnapshot = profile === null ? profileSnapshot(createInitialHomeState()) : {
    ...copyProfile(profile), university: profile.university as University, stage: profile.stage as Stage, profileSet: true, onboardingDraft: null,
  };
  if (clearDraft) delete drafts[userId];
  saved.onboardingDraft = clearDraft ? null : switching ? drafts[userId] ?? null : state.onboardingDraft;
  const next = { ...state, ...saved, profileScope: { ownerId: userId, guest, drafts } };
  return JSON.stringify(next) === JSON.stringify(state) ? state : next;
}

const initial = createInitialHomeState();
let current = initial;
let initialized = false;
const listeners = new Set<() => void>();
function notify() { listeners.forEach(listener => listener()); }

/** The v1 backup is retained. Invalid or inaccessible storage is never overwritten. */
export function loadHomeState(storage: Pick<Storage, "getItem" | "setItem">, fallback: HomeState = createInitialHomeState()): HomeState {
  let loaded = fallback;
  try {
    const raw = storage.getItem(HOME_STORAGE_KEY);
    if (raw !== null) return parseStoredState(raw);
    const legacy = storage.getItem(LEGACY_HOME_STORAGE_KEY);
    loaded = parseStoredState(legacy);
    if (legacy !== null) storage.setItem(HOME_STORAGE_KEY, JSON.stringify(loaded));
    return loaded;
  } catch {
    return { ...loaded, storageUnavailable: true };
  }
}

function readStorage() {
  if (typeof window === "undefined") return;
  try { current = loadHomeState(window.localStorage, current); }
  catch { current = { ...current, storageUnavailable: true }; }
}

function handleStorage(event: StorageEvent) {
  if (typeof window === "undefined" || (event.key !== HOME_STORAGE_KEY && event.key !== LEGACY_HOME_STORAGE_KEY && event.key !== null)) return;
  try {
    if (event.storageArea !== null && event.storageArea !== window.localStorage) return;
  } catch {
    current = { ...current, storageUnavailable: true };
    notify();
    return;
  }
  readStorage();
  notify();
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("storage", handleStorage);
  readStorage();
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initialize();
  return () => { listeners.delete(listener); };
}

function commitHome(update: (state: HomeState) => HomeState) {
  if (typeof window === "undefined") return;
  initialize();
  // Read before write so another tab's update is preserved even before its event arrives.
  if (!current.storageUnavailable) readStorage();
  current = update(current);
  if (!current.storageUnavailable) {
    try { window.localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify(current)); }
    catch { current = { ...current, storageUnavailable: true }; }
  }
  notify();
}

export function updateHome(patch: Partial<Omit<HomeState, "schemaVersion">>) {
  commitHome(state => {
    const next = { ...state, ...patch };
    if (!facultyBelongs(next.university, next.faculty)) next.faculty = "";
    return next;
  });
}

export function updateProfileDraft(patch: Partial<ProfileDraft>) {
  commitHome(state => withProfileDraft(state, patch));
}

/** Registration/login/session use this projection; successful profile saves clear the draft explicitly. */
export function applyMemberProfile(userId: string | null, profile: ProfileDraft | null, options?: { clearDraft?: boolean }): void {
  commitHome(state => withMemberProfile(state, userId, profile, options));
}

/** A successful result means the profile is accepted; storageUnavailable reports memory-only mode. */
export function saveProfileDraft(): boolean {
  let accepted = false;
  commitHome(state => {
    const next = withSavedProfile(state);
    accepted = next !== null;
    return next ?? state;
  });
  return accepted;
}

export function resetProfile() { commitHome(withResetProfile); }

export function toggleSaved(id: string) {
  commitHome(state => ({ ...state, saved: state.saved.includes(id) ? state.saved.filter(item => item !== id) : [...state.saved, id] }));
}

export function toggleStep(id: string, step: number) {
  if (!Number.isInteger(step) || step < 0 || step >= 3) return;
  commitHome(state => {
    const steps = Object.hasOwn(state.completed, id) ? state.completed[id] : [];
    return { ...state, completed: { ...state.completed, [id]: steps.includes(step) ? steps.filter(item => item !== step) : [...steps, step] } };
  });
}

export function useHomeState() {
  return useSyncExternalStore(subscribe, () => current, () => initial);
}
