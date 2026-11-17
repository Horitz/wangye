import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = { exports: {} };
  cache.set(filename, compiled);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = name => name.startsWith("@/") ? load(resolve(root, "src", `${name.slice(2)}.ts`))
    : name.startsWith(".") ? load(resolve(dirname(filename), `${name}.ts`)) : nativeRequire(name);
  new Function("require", "module", "exports", output)(require, compiled, compiled.exports);
  return compiled.exports;
}
const model = load(resolve(root, "src/lib/personal-plan-model.ts"));
const { getEditorialDefault } = load(resolve(root, "src/data/editorial-content.ts"));
const { createInitialHomeState, HOME_STORAGE_KEY, LEGACY_HOME_STORAGE_KEY } = load(resolve(root, "src/lib/home-store.ts"));
const { createInitialPreparationState, PREPARATION_STORAGE_KEY } = load(resolve(root, "src/lib/preparation-store.ts"));
const { preparationGroups } = load(resolve(root, "src/data/preparation-content.ts"));
const { PERSONAL_PLAN_STORAGE_KEY, createInitialPersonalPlan, loadPersonalPlan, parsePersonalPlan, serializePersonalPlan,
  withDocumentInPlan, withToggledPlanTask, withSavedPlanTask, withDeletedPlanTask } = model;
function storageWith(entries = {}) {
  const values = new Map(Object.entries(entries));
  const writes = [];
  return { values, writes, getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push(key); values.set(key, value); } };
}
const homeWith = completed => JSON.stringify({ ...createInitialHomeState(), completed });
const prepWith = changes => JSON.stringify({ ...createInitialPreparationState(), ...changes });
const customGuideId = "guide-7eb5f6ac-2236-42b8-9045-616dc8b9a112";
function customGuide(stepCount = 4) {
  const template = getEditorialDefault("first-week");
  return {
    ...structuredClone(template), id: customGuideId, sectionId: "first-week",
    title: { zh: "自定义抵达攻略", ru: "Новая инструкция по приезду" },
    steps: Array.from({ length: stepCount }, (_, index) => ({
      ...structuredClone(template.steps[0]), id: `step-custom-${index}`, legacyIndex: 0,
      title: { zh: `准备事项 ${index + 1}`, ru: `Подготовка ${index + 1}` },
    })),
  };
}

test("new users and untouched old starter lists have no automatic tasks", () => {
  for (const storage of [storageWith(), storageWith({ [HOME_STORAGE_KEY]: homeWith({ "first-week": [] }), [PREPARATION_STORAGE_KEY]: prepWith({}) })]) {
    const result = loadPersonalPlan(storage);
    assert.deepEqual(result.groups, []);
    assert.equal(result.hydrated, true);
    assert.equal(result.storageUnavailable, false);
    assert.deepEqual(storage.writes, [PERSONAL_PLAN_STORAGE_KEY]);
  }
});

test("explicit add snapshots published steps, deduplicates repeat adds and never copies images", () => {
  const document = structuredClone(getEditorialDefault("essentials"));
  document.images = [{ id: "cover", dataUrl: "data:image/jpeg;base64,test" }];
  document.steps[0].images = [{ id: "material", dataUrl: "data:image/jpeg;base64,test" }];
  const before = structuredClone(document);
  const once = withDocumentInPlan(createInitialPersonalPlan(), document);
  assert.equal(once.groups.length, 1);
  assert.equal(once.groups[0].tasks.length, 3);
  assert.equal(once.groups[0].sourceId, "essentials");
  assert.ok(once.groups[0].tasks.every(task => !task.done && task.date === "" && task.note === ""));
  assert.equal(serializePersonalPlan(once).includes("data:image"), false);
  assert.equal(withDocumentInPlan(once, document), once);
  document.title.zh = "Changed published title";
  document.steps[0].title.zh = "Changed published step";
  assert.deepEqual(once.groups[0].title, before.title);
  assert.deepEqual(once.groups[0].tasks[0].title, before.steps[0].title);
});

test("legacy guide progress maps 0/1/2 to stable step ids and old keys remain byte-for-byte unchanged", () => {
  const home = homeWith({ "visa-extension": [0, 2, 2], "first-week": [], removed: [1] });
  const storage = storageWith({ [HOME_STORAGE_KEY]: home });
  const result = loadPersonalPlan(storage);
  assert.equal(result.groups.length, 1);
  const group = result.groups[0];
  assert.equal(group.id, "visa-extension");
  assert.deepEqual(group.tasks.filter(task => task.done).map(task => task.sourceStepId), ["visa-extension-confirm-process", "visa-extension-check-follow-up"]);
  assert.equal(group.tasks.length, 3);
  assert.equal(storage.getItem(HOME_STORAGE_KEY), home);
  assert.deepEqual(storage.writes, [PERSONAL_PLAN_STORAGE_KEY]);
});

test("home v1 is supported only when v2 is absent", () => {
  const legacy = { schemaVersion: 1, locale: "ru", stage: "newArrival", university: "msu", profileSet: true, saved: [], completed: { "first-week": [1] } };
  const storage = storageWith({ [LEGACY_HOME_STORAGE_KEY]: JSON.stringify(legacy) });
  assert.deepEqual(loadPersonalPlan(storage).groups.map(group => group.id), ["first-week"]);
  assert.equal(storage.getItem(LEGACY_HOME_STORAGE_KEY), JSON.stringify(legacy));
  const newer = storageWith({ [HOME_STORAGE_KEY]: homeWith({}), [LEGACY_HOME_STORAGE_KEY]: JSON.stringify(legacy) });
  assert.deepEqual(loadPersonalPlan(newer).groups, []);
});

test("used preparation list, completed dates and unsaved draft are preserved without inventing mapping", () => {
  const reminder = { id: "reminder-trip", title: "询问住宿", date: "2026-12-01", note: "下午", done: true };
  const original = prepWith({ completed: ["before-questions", "daily-route"], reminders: [reminder], draft: { editingId: reminder.id, title: "改过的草稿", date: "2026-12-02", note: "待保存" } });
  const storage = storageWith({ [PREPARATION_STORAGE_KEY]: original });
  const result = loadPersonalPlan(storage);
  assert.equal(result.groups.length, 2);
  const oldList = result.groups[0];
  assert.equal(oldList.id, "legacy-preparation");
  assert.equal(oldList.sourceId, undefined);
  assert.deepEqual(oldList.tasks.map(task => task.id), preparationGroups.flatMap(group => group.items.map(item => item.id)));
  assert.equal(oldList.tasks.filter(task => task.done).length, 2);
  assert.equal(result.groups[1].tasks.length, 1);
  assert.deepEqual(result.groups[1].tasks[0], { ...reminder, title: { zh: reminder.title, ru: reminder.title } });
  assert.equal(result.recoveredDraft.id, reminder.id);
  assert.equal(result.recoveredDraft.title.zh, "改过的草稿");
  assert.equal(result.groups.flatMap(group => group.tasks).length, 10);
  assert.deepEqual(parsePersonalPlan(serializePersonalPlan(result)), result);
  assert.equal(storage.getItem(PREPARATION_STORAGE_KEY), original);
});

test("loading existing unified plan never reimports old completions after undo or deletion", () => {
  const storage = storageWith({ [HOME_STORAGE_KEY]: homeWith({ "first-week": [0] }) });
  const original = loadPersonalPlan(storage);
  const task = original.groups[0].tasks[0];
  let changed = withToggledPlanTask(original, "first-week", task.id);
  changed = withDeletedPlanTask(changed, "first-week", changed.groups[0].tasks[1].id);
  storage.setItem(PERSONAL_PLAN_STORAGE_KEY, serializePersonalPlan(changed));
  const reloaded = loadPersonalPlan(storage);
  assert.equal(reloaded.groups[0].tasks.length, 2);
  assert.equal(reloaded.groups[0].tasks.filter(task => task.done).length, 0);
  assert.equal(withDocumentInPlan(reloaded, getEditorialDefault("first-week")), reloaded);
});

test("personal title/date/note edits and completion are isolated from published document", () => {
  const document = getEditorialDefault("essentials");
  const before = structuredClone(document);
  let state = withDocumentInPlan(createInitialPersonalPlan(), document);
  const task = state.groups[0].tasks[0];
  state = withToggledPlanTask(state, document.id, task.id);
  state = withSavedPlanTask(state, document.id, { id: task.id, title: { zh: "我自己的安排", ru: "我自己的安排" }, date: "2026-12-04", note: "带便签" }, "unused");
  assert.equal(state.groups[0].tasks[0].done, true);
  assert.equal(state.groups[0].tasks[0].sourceStepId, task.sourceStepId);
  assert.equal(state.groups[0].tasks[0].date, "2026-12-04");
  assert.deepEqual(document, before);
  state = withToggledPlanTask(state, document.id, task.id);
  assert.equal(state.groups[0].tasks[0].done, false);
  assert.deepEqual(parsePersonalPlan(serializePersonalPlan(state)).groups, state.groups);
});

test("custom tasks are added to the chosen group; date-only personal plans join same count", () => {
  let state = withDocumentInPlan(createInitialPersonalPlan(), getEditorialDefault("essentials"));
  const input = { title: { zh: "自己的任务", ru: "自己的任务" }, date: "", note: "" };
  state = withSavedPlanTask(state, "essentials", input, "task-custom");
  assert.equal(state.groups[0].tasks.length, 4);
  assert.equal(state.groups[0].tasks.at(-1).sourceStepId, undefined);
  state = withSavedPlanTask(state, "personal", { ...input, date: "2028-02-29" }, "task-calendar");
  assert.equal(state.groups.flatMap(group => group.tasks).length, 5);
  state = withDeletedPlanTask(state, "essentials", "task-custom");
  assert.equal(state.groups.flatMap(group => group.tasks).length, 4);
  assert.equal(withSavedPlanTask(state, "unknown", input, "task-no"), state);
  assert.equal(withSavedPlanTask(state, "personal", { ...input, date: "2027-02-29" }, "task-no"), state);
  assert.equal(withSavedPlanTask(state, "personal", { ...input, id: "missing" }, "task-no"), state);
});

test("broken storage never overwrites data; valid migrations survive write failures in memory", () => {
  const broken = storageWith({ [PERSONAL_PLAN_STORAGE_KEY]: "{broken" });
  assert.equal(loadPersonalPlan(broken).storageUnavailable, true);
  assert.equal(broken.getItem(PERSONAL_PLAN_STORAGE_KEY), "{broken");
  assert.deepEqual(broken.writes, []);
  const legacyBroken = storageWith({ [HOME_STORAGE_KEY]: "{broken", [PREPARATION_STORAGE_KEY]: prepWith({ reminders: [{ id: "reminder-kept", title: "保留", date: "2026-12-01", note: "", done: false }] }) });
  const recovered = loadPersonalPlan(legacyBroken);
  assert.equal(recovered.storageUnavailable, true);
  assert.equal(recovered.groups[0].tasks[0].title.zh, "保留");
  assert.deepEqual(legacyBroken.writes, []);
  const source = storageWith({ [HOME_STORAGE_KEY]: homeWith({ "first-week": [0] }) });
  const quota = loadPersonalPlan({ getItem: source.getItem, setItem: () => { throw new Error("quota"); } });
  assert.equal(quota.storageUnavailable, true);
  assert.equal(quota.groups[0].tasks[0].done, true);
});

test("malformed duplicate saved identities cannot inflate totals", () => {
  const state = withDocumentInPlan(createInitialPersonalPlan(), getEditorialDefault("essentials"));
  const duplicateTask = structuredClone(state);
  duplicateTask.groups[0].tasks.push(duplicateTask.groups[0].tasks[0]);
  assert.throws(() => parsePersonalPlan(serializePersonalPlan(duplicateTask)));
  const duplicateGroup = { ...state, groups: [...state.groups, ...state.groups] };
  assert.throws(() => parsePersonalPlan(serializePersonalPlan(duplicateGroup)));
});

test("custom guides persist every saved step and repeat adds stay deduplicated after reload", () => {
  for (const count of [1, 20]) {
    const document = customGuide(count);
    const initial = withDocumentInPlan(createInitialPersonalPlan(), document);
    const storage = storageWith({ [PERSONAL_PLAN_STORAGE_KEY]: serializePersonalPlan(initial) });
    const reloaded = loadPersonalPlan(storage);
    assert.equal(reloaded.storageUnavailable, false);
    assert.equal(reloaded.groups.length, 1);
    assert.equal(reloaded.groups[0].sourceId, customGuideId);
    assert.deepEqual(reloaded.groups[0].tasks.map(task => task.sourceStepId), document.steps.map(step => step.id));
    assert.equal(withDocumentInPlan(reloaded, document), reloaded);
    assert.deepEqual(storage.writes, []);
  }
});

test("custom source completion, undo and personal edits survive storage reload together", () => {
  const document = customGuide();
  let state = withDocumentInPlan(createInitialPersonalPlan(), document);
  const taskId = document.steps[1].id;
  state = withToggledPlanTask(state, document.id, taskId);
  state = withSavedPlanTask(state, document.id, { id: taskId, title: { zh: "我的抵达安排", ru: "Мой план приезда" }, date: "2026-12-10", note: "下午办理" }, "unused");
  state = withSavedPlanTask(state, document.id, { title: { zh: "取行李", ru: "Забрать багаж" }, date: "", note: "" }, "task-personal-baggage");
  const storage = storageWith({ [PERSONAL_PLAN_STORAGE_KEY]: serializePersonalPlan(state) });
  const completed = loadPersonalPlan(storage);
  assert.equal(completed.groups[0].tasks.length, 5);
  assert.equal(completed.groups[0].tasks.filter(task => task.done).length, 1);
  assert.deepEqual(completed.groups[0].tasks[1], state.groups[0].tasks[1]);
  assert.equal(completed.groups[0].tasks.at(-1).sourceStepId, undefined);
  storage.setItem(PERSONAL_PLAN_STORAGE_KEY, serializePersonalPlan(withToggledPlanTask(completed, document.id, taskId)));
  const undone = loadPersonalPlan(storage);
  assert.equal(undone.groups[0].tasks.filter(task => task.done).length, 0);
  assert.equal(undone.groups[0].tasks[1].date, "2026-12-10");
  assert.equal(undone.groups[0].tasks[1].note, "下午办理");
  assert.equal(undone.groups[0].tasks[1].sourceStepId, taskId);
});

test("editing or deleting published custom steps leaves the personal snapshot intact", () => {
  const document = customGuide();
  const initial = withDocumentInPlan(createInitialPersonalPlan(), document);
  const snapshot = structuredClone(initial.groups[0]);
  const persisted = serializePersonalPlan(initial);
  document.title.zh = "网站已改标题";
  document.steps.splice(0, 2);
  document.steps.reverse();
  document.steps[0].title.zh = "网站已改段落";
  const reloaded = loadPersonalPlan(storageWith({ [PERSONAL_PLAN_STORAGE_KEY]: persisted }));
  assert.equal(reloaded.storageUnavailable, false);
  assert.deepEqual(reloaded.groups[0], snapshot);
  assert.equal(withDocumentInPlan(reloaded, document), reloaded);
  const completed = withToggledPlanTask(reloaded, document.id, snapshot.tasks[0].id);
  assert.equal(completed.groups[0].tasks[0].done, true);
  assert.equal(parsePersonalPlan(serializePersonalPlan(completed)).groups[0].tasks.length, 4);
});

test("custom identities are controlled while built-in step validation and legacy migration remain strict", () => {
  for (const sourceId of ["guide-not-a-uuid", "guide-7eb5f6ac-2236-42b8-9045-616dc8b9a11z", "unknown-source"]) {
    const state = withDocumentInPlan(createInitialPersonalPlan(), { ...customGuide(), id: sourceId });
    assert.throws(() => parsePersonalPlan(serializePersonalPlan(state)));
  }
  const mismatched = withDocumentInPlan(createInitialPersonalPlan(), customGuide());
  mismatched.groups[0].id = "guide-01403279-65b0-4a1d-96ba-f154c237536a";
  assert.throws(() => parsePersonalPlan(serializePersonalPlan(mismatched)));
  const invalidBuiltInStep = withDocumentInPlan(createInitialPersonalPlan(), getEditorialDefault("first-week"));
  invalidBuiltInStep.groups[0].tasks[0].sourceStepId = "step-outside-published-source";
  assert.throws(() => parsePersonalPlan(serializePersonalPlan(invalidBuiltInStep)));
  const legacy = homeWith({ [customGuideId]: [0], "first-week": [1] });
  const storage = storageWith({ [HOME_STORAGE_KEY]: legacy });
  assert.deepEqual(loadPersonalPlan(storage).groups.map(group => group.id), ["first-week"]);
  assert.equal(storage.getItem(HOME_STORAGE_KEY), legacy);
});
