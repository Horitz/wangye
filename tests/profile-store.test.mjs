import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));

// Compile the existing TypeScript in memory; no generated files or extra test dependency.
function loadStore(browser) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} };
    cache.set(filename, compiledModule);
    const output = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const require = name => {
      if (name === "react") return { useSyncExternalStore: (subscribe, getSnapshot) => { subscribe(() => {}); return getSnapshot(); } };
      return load(resolve(dirname(filename), `${name}.ts`));
    };
    new Function("require", "module", "exports", "window", output)(require, compiledModule, compiledModule.exports, browser);
    return compiledModule.exports;
  }
  return load(resolve(root, "src/lib/home-store.ts"));
}

function memoryStorage(entries = {}) {
  const data = new Map(Object.entries(entries));
  const writes = [];
  return {
    data, writes,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { writes.push(key); data.set(key, value); },
  };
}
const legacy = {
  schemaVersion: 1, locale: "ru", stage: "newArrival", university: "msu", profileSet: true,
  saved: ["visa-extension", "medical-examination"], completed: { "visa-extension": [0, 2] }, storageUnavailable: false,
};

test("new schools persist without clearing saved guides and cannot retain MSU faculty", () => {
  const store = loadStore();
  const original = store.parseStoredState(JSON.stringify(legacy));
  for (const school of ["hse", "rudn"]) {
    const drafted = store.withProfileDraft(original, { university: school, faculty: "physics" });
    assert.equal(drafted.onboardingDraft.faculty, "");
    const saved = store.withSavedProfile(drafted);
    assert.equal(saved.university, school);
    assert.deepEqual(saved.saved, original.saved);
    assert.deepEqual(saved.completed, original.completed);
    assert.deepEqual(store.parseStoredState(JSON.stringify(saved)), saved);
  }
  assert.throws(() => store.withProfileDraft(original, { university: "invalid-school" }));
});

test("v1 migration preserves preferences, saved guides, progress and the untouched backup", () => {
  const store = loadStore();
  const raw = JSON.stringify(legacy);
  const storage = memoryStorage({ [store.LEGACY_HOME_STORAGE_KEY]: raw });
  const migrated = store.loadHomeState(storage);
  assert.equal(migrated.schemaVersion, 2);
  for (const key of ["locale", "stage", "university", "profileSet", "saved", "completed"]) assert.deepEqual(migrated[key], legacy[key]);
  assert.equal(migrated.degreeLevel, "unknown");
  assert.equal(migrated.faculty, "");
  assert.equal(storage.getItem(store.LEGACY_HOME_STORAGE_KEY), raw);
  assert.deepEqual(JSON.parse(storage.getItem(store.HOME_STORAGE_KEY)), migrated);
});

test("v2 takes priority over the v1 backup and round-trips an unfinished draft", () => {
  const store = loadStore();
  const state = store.withProfileDraft(store.createInitialHomeState(), { university: "msu", faculty: "physics", interests: ["health"] });
  const storage = memoryStorage({ [store.HOME_STORAGE_KEY]: JSON.stringify(state), [store.LEGACY_HOME_STORAGE_KEY]: JSON.stringify(legacy) });
  assert.deepEqual(store.loadHomeState(storage), state);
  assert.equal(store.getProfileDraft(store.loadHomeState(storage)).stage, null);
  assert.equal(storage.writes.length, 0);
});

test("corrupted v2 data does not silently fall back to v1 or overwrite user data", () => {
  const store = loadStore();
  for (const invalid of ["{broken", JSON.stringify({ ...store.createInitialHomeState(), faculty: "missing-faculty" }), JSON.stringify({ ...store.createInitialHomeState(), schemaVersion: 99 })]) {
    const storage = memoryStorage({ [store.HOME_STORAGE_KEY]: invalid, [store.LEGACY_HOME_STORAGE_KEY]: JSON.stringify(legacy) });
    const fallback = { ...store.createInitialHomeState(), locale: "ru", saved: ["bank-card"] };
    const result = store.loadHomeState(storage, fallback);
    assert.equal(result.storageUnavailable, true);
    assert.deepEqual(result.saved, fallback.saved);
    assert.equal(storage.getItem(store.HOME_STORAGE_KEY), invalid);
    assert.equal(storage.writes.length, 0);
  }
});

test("migration quota failure retains parsed legacy records in memory", () => {
  const store = loadStore();
  const storage = memoryStorage({ [store.LEGACY_HOME_STORAGE_KEY]: JSON.stringify(legacy) });
  storage.setItem = () => { throw new Error("Quota exceeded"); };
  const result = store.loadHomeState(storage);
  assert.equal(result.storageUnavailable, true);
  assert.deepEqual(result.completed, legacy.completed);
  assert.deepEqual(result.saved, legacy.saved);
  assert.equal(result.locale, "ru");
});

test("save requires an explicit school and status; changing schools clears incompatible faculty", () => {
  const store = loadStore();
  const initial = store.createInitialHomeState();
  assert.equal(store.withSavedProfile(initial), null);
  const oneChoice = store.withProfileDraft(initial, { university: "msu", faculty: "physics" });
  assert.equal(store.withSavedProfile(oneChoice), null);
  const complete = store.withProfileDraft(oneChoice, { stage: "prospective", degreeLevel: "master", interests: ["study"] });
  const committed = store.withSavedProfile(complete);
  assert.equal(committed.profileSet, true);
  assert.equal(committed.faculty, "physics");
  assert.equal(committed.stage, "prospective");
  assert.equal(committed.onboardingDraft, null);
  const changed = store.withProfileDraft(committed, { university: "other" });
  assert.equal(changed.faculty, "physics", "unsaved edits do not change the committed profile");
  assert.equal(changed.onboardingDraft.faculty, "");
  assert.equal(store.withSavedProfile(changed).faculty, "");
});

test("draft edits and profile reset preserve language, saved guides and progress", () => {
  const store = loadStore();
  const initial = store.parseStoredState(JSON.stringify(legacy));
  const draft = store.withProfileDraft(initial, { stage: "enrolled", faculty: "journalism", interests: ["documents", "documents"] });
  assert.equal(draft.stage, "newArrival");
  assert.deepEqual(draft.onboardingDraft.interests, ["documents"]);
  const reset = store.withResetProfile(draft);
  for (const key of ["locale", "saved", "completed"]) assert.deepEqual(reset[key], initial[key]);
  assert.equal(reset.profileSet, false);
  assert.equal(reset.onboardingDraft, null);
  assert.equal(store.getProfileDraft(reset).university, null);
  assert.equal(store.getProfileDraft(reset).stage, null);
});

test("public APIs retain a draft across language changes and preserve another tab's latest marks", () => {
  const storage = memoryStorage();
  const store = loadStore({ localStorage: storage, addEventListener() {} });
  store.updateProfileDraft({ university: "msu", stage: "enrolled", faculty: "economics" });
  store.updateHome({ locale: "ru" });
  let stored = JSON.parse(storage.getItem(store.HOME_STORAGE_KEY));
  assert.equal(stored.onboardingDraft.faculty, "economics");
  stored.saved = ["visa-extension"];
  stored.completed = { "visa-extension": [0] };
  storage.setItem(store.HOME_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(store.saveProfileDraft(), true);
  store.toggleStep("visa-extension", 2);
  const saved = JSON.parse(storage.getItem(store.HOME_STORAGE_KEY));
  assert.equal(saved.faculty, "economics");
  assert.equal(saved.locale, "ru");
  assert.deepEqual(saved.saved, ["visa-extension"]);
  assert.deepEqual(saved.completed["visa-extension"], [0, 2]);
  store.resetProfile();
  const reset = JSON.parse(storage.getItem(store.HOME_STORAGE_KEY));
  assert.deepEqual(reset.saved, saved.saved);
  assert.deepEqual(reset.completed, saved.completed);
});

test("a blocked localStorage getter supports the complete flow in memory", () => {
  const browser = { addEventListener() {}, get localStorage() { throw new Error("Blocked"); } };
  const store = loadStore(browser);
  store.updateProfileDraft({ university: "other", stage: "newArrival" });
  store.updateHome({ locale: "ru" });
  assert.equal(store.saveProfileDraft(), true);
  store.toggleSaved("first-week");
  const state = store.useHomeState();
  assert.equal(state.storageUnavailable, true);
  assert.equal(state.locale, "ru");
  assert.equal(state.profileSet, true);
  assert.equal(state.university, "other");
  assert.deepEqual(state.saved, ["first-week"]);
});

const aliceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const bobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const memberProfile = (university = "hse", stage = "enrolled") => ({ university, stage, faculty: "", degreeLevel: "master", interests: ["study"], cityId: "moscow" });

test("member profiles replace only the active basic information and restore the original guest", () => {
  const store = loadStore();
  const guest = store.withProfileDraft(store.parseStoredState(JSON.stringify(legacy)), { university: "rudn", stage: "prospective" });
  const alice = store.withMemberProfile(guest, aliceId, memberProfile());
  assert.equal(alice.university, "hse");
  assert.equal(alice.profileSet, true);
  assert.equal(alice.onboardingDraft, null, "guest edits are not adopted as member information");
  for (const key of ["locale", "saved", "completed"]) assert.deepEqual(alice[key], guest[key]);
  const changed = { ...alice, locale: "zh", saved: [...alice.saved, "bank-card"], completed: { ...alice.completed, "bank-card": [1] } };
  const restored = store.withMemberProfile(changed, null, null);
  for (const key of ["university", "stage", "profileSet", "faculty", "degreeLevel", "interests", "onboardingDraft"]) assert.deepEqual(restored[key], guest[key]);
  for (const key of ["locale", "saved", "completed"]) assert.deepEqual(restored[key], changed[key]);
});

test("member drafts are isolated for A, B and the guest and survive a switch back", () => {
  const store = loadStore();
  const guest = store.withProfileDraft(store.createInitialHomeState(), { university: "other" });
  const alice = store.withProfileDraft(store.withMemberProfile(guest, aliceId, memberProfile()), { stage: "newArrival", interests: ["health"] });
  const bob = store.withMemberProfile(alice, bobId, null);
  assert.equal(bob.profileSet, false);
  assert.equal(store.getProfileDraft(bob).university, null);
  const bobDraft = store.withProfileDraft(bob, { university: "rudn", stage: "prospective" });
  const aliceAgain = store.withMemberProfile(bobDraft, aliceId, memberProfile());
  assert.deepEqual(aliceAgain.onboardingDraft, alice.onboardingDraft);
  const guestAgain = store.withMemberProfile(aliceAgain, null, null);
  assert.deepEqual(guestAgain.onboardingDraft, guest.onboardingDraft);
  const bobAgain = store.withMemberProfile(guestAgain, bobId, null);
  assert.deepEqual(bobAgain.onboardingDraft, bobDraft.onboardingDraft);
  assert.equal(bobAgain.profileSet, false);
});

test("refresh recognizes the stored member projection instead of relabeling it as the guest", () => {
  const store = loadStore();
  const guest = store.parseStoredState(JSON.stringify(legacy));
  const alice = store.withProfileDraft(store.withMemberProfile(guest, aliceId, memberProfile()), { interests: ["health"] });
  const persisted = store.parseStoredState(JSON.stringify(alice));
  const refreshed = store.withMemberProfile(persisted, aliceId, memberProfile());
  assert.deepEqual(refreshed.onboardingDraft, alice.onboardingDraft);
  assert.equal(refreshed.profileScope.ownerId, aliceId);
  const loggedOut = store.withMemberProfile(refreshed, null, null);
  assert.equal(loggedOut.university, guest.university);
  assert.equal(loggedOut.stage, guest.stage);
  assert.equal(loggedOut.onboardingDraft, guest.onboardingDraft);
});

test("passive same-account refresh preserves edits; an explicit saved projection clears only that member draft", () => {
  const store = loadStore();
  const alice = store.withProfileDraft(store.withMemberProfile(store.createInitialHomeState(), aliceId, memberProfile()), { stage: "prospective" });
  const refreshed = store.withMemberProfile(alice, aliceId, memberProfile("rudn"));
  assert.equal(refreshed.university, "rudn", "committed server information may refresh");
  assert.deepEqual(refreshed.onboardingDraft, alice.onboardingDraft);
  assert.equal(store.withMemberProfile(refreshed, aliceId, memberProfile("rudn")), refreshed, "unchanged refresh is a stable snapshot");
  const saved = store.withMemberProfile(refreshed, aliceId, memberProfile("hse", "prospective"), { clearDraft: true });
  assert.equal(saved.onboardingDraft, null);
  assert.equal(saved.stage, "prospective");
  const back = store.withMemberProfile(store.withMemberProfile(saved, null, null), aliceId, memberProfile("hse", "prospective"));
  assert.equal(back.onboardingDraft, null);
});

test("corrupted ownership metadata is not overwritten and cannot become a guest profile", () => {
  const initialStore = loadStore();
  const raw = JSON.stringify({ ...initialStore.createInitialHomeState(), university: "hse", profileScope: { ownerId: aliceId, guest: "broken", drafts: {} } });
  const storage = memoryStorage({ [initialStore.HOME_STORAGE_KEY]: raw });
  const store = loadStore({ localStorage: storage, addEventListener() {} });
  store.applyMemberProfile(aliceId, memberProfile("rudn"));
  assert.equal(store.useHomeState().storageUnavailable, true);
  assert.equal(storage.getItem(store.HOME_STORAGE_KEY), raw);
  assert.equal(storage.writes.length, 0);
  store.applyMemberProfile(null, null);
  assert.equal(store.useHomeState().profileSet, false);
});

test("public projection persists owner and edits atomically while blocked storage keeps the flow in memory", () => {
  for (const blocked of [false, true]) {
    const storage = memoryStorage();
    const browser = blocked ? { addEventListener() {}, get localStorage() { throw new Error("Blocked"); } } : { localStorage: storage, addEventListener() {} };
    const store = loadStore(browser);
    store.updateProfileDraft({ university: "other", stage: "newArrival" });
    store.applyMemberProfile(aliceId, null);
    store.updateProfileDraft({ university: "msu", stage: "enrolled", faculty: "physics" });
    store.updateHome({ locale: "ru" });
    store.toggleSaved("first-week");
    store.applyMemberProfile(bobId, memberProfile());
    store.applyMemberProfile(aliceId, null);
    assert.equal(store.useHomeState().onboardingDraft.faculty, "physics");
    if (!blocked) {
      const reloaded = loadStore(browser);
      reloaded.applyMemberProfile(null, null);
      assert.equal(reloaded.useHomeState().onboardingDraft.university, "other");
      assert.deepEqual(reloaded.useHomeState().saved, ["first-week"]);
      assert.equal(reloaded.useHomeState().locale, "ru");
      assert.ok(storage.writes.every(key => key === store.HOME_STORAGE_KEY));
    } else assert.equal(store.useHomeState().storageUnavailable, true);
  }
});
