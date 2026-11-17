import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
function loadStore(browser) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} }; cache.set(filename, compiledModule);
    const output = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = name => name === "react" ? { useSyncExternalStore: (subscribe, getSnapshot) => { subscribe(() => {}); return getSnapshot(); } } : load(resolve(dirname(filename), `${name}.ts`));
    new Function("require", "module", "exports", "window", output)(require, compiledModule, compiledModule.exports, browser);
    return compiledModule.exports;
  }
  return load(resolve(root, "src/lib/preparation-store.ts"));
}
function memoryStorage(entries = {}) {
  const data = new Map(Object.entries(entries)); const writes = [];
  return { data, writes, getItem: key => data.get(key) ?? null, setItem: (key, value) => { writes.push(key); data.set(key, value); } };
}
function environment(storage = memoryStorage()) {
  const handlers = new Map();
  const browser = { localStorage: storage, addEventListener: (name, handler) => handlers.set(name, handler) };
  return { store: loadStore(browser), storage, event: event => handlers.get("storage")?.({ storageArea: storage, ...event }) };
}
function draft(store, patch = {}) { store.updatePreparationDraft({ title: "学校安排确认", date: "2026-11-20", note: "我自己确认的安排", ...patch }); }

test("first use never invents completed tasks or dates and uses its own key", () => {
  const { store, storage } = environment(); const state = store.usePreparationState();
  assert.deepEqual(state.completed, []); assert.deepEqual(state.reminders, []);
  assert.equal(state.hydrated, true); assert.equal(state.storageUnavailable, false);
  assert.equal(storage.writes.length, 0);
  assert.equal(store.PREPARATION_STORAGE_KEY, "studentpath:preparation:v1");
});
test("server snapshots are unhydrated and cannot accept mutations", () => {
  const store = loadStore();
  store.togglePreparationItem("before-questions"); draft(store);
  assert.equal(store.usePreparationState().hydrated, false);
  assert.deepEqual(store.usePreparationState().completed, []);
  assert.equal(store.savePreparationReminder(), null);
});
test("only stable preparation IDs can be toggled and they persist across refresh", () => {
  const { store, storage } = environment();
  store.togglePreparationItem("before-questions"); store.togglePreparationItem("arrival-next"); store.togglePreparationItem("unknown-id");
  assert.deepEqual(store.usePreparationState().completed, ["before-questions", "arrival-next"]);
  assert.deepEqual(environment(storage).store.usePreparationState().completed, ["before-questions", "arrival-next"]);
  store.togglePreparationItem("before-questions"); assert.deepEqual(store.usePreparationState().completed, ["arrival-next"]);
});
test("date validation rejects rollovers and accepts leap years without timestamp conversions", () => {
  const store = loadStore();
  for (const date of ["2024-02-29", "2026-11-30", "1900-01-01", "9999-12-31"]) assert.equal(store.isPreparationDate(date), true, date);
  for (const date of ["2025-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "2026-1-2", "1899-12-31", "2026-11-20T00:00:00Z", "", null]) assert.equal(store.isPreparationDate(date), false, String(date));
  assert.equal(store.preparationDaysUntil("2026-03-30", "2026-03-29"), 1);
  assert.equal(store.preparationDaysUntil("2026-10-26", "2026-10-25"), 1);
  assert.equal(store.preparationDaysUntil("2024-03-01", "2024-02-28"), 2);
  assert.equal(store.preparationDaysUntil("2026-11-20", "2026-11-20"), 0);
  assert.equal(store.preparationDaysUntil("2026-11-19", "2026-11-20"), -1);
  assert.equal(store.preparationDaysUntil("not-a-date", "2026-11-20"), null);
});
test("today uses local calendar components, including immediately before and after midnight", () => {
  const store = loadStore();
  assert.equal(store.localPreparationDate(new Date(2026, 10, 16, 23, 59, 59)), "2026-11-16");
  assert.equal(store.localPreparationDate(new Date(2026, 10, 17, 0, 0, 0)), "2026-11-17");
});
test("an unfinished draft survives reload while invalid saves retain user input", () => {
  const { store, storage } = environment(); draft(store, { date: "" });
  assert.equal(store.savePreparationReminder(), null);
  assert.equal(store.usePreparationState().draft.title, "学校安排确认");
  assert.equal(environment(storage).store.usePreparationState().draft.date, "");
  store.updatePreparationDraft({ date: "2026-11-20", title: "   " });
  assert.equal(store.savePreparationReminder(), null);
  store.updatePreparationDraft({ title: "有效标题", note: "x".repeat(241) });
  assert.equal(store.usePreparationState().draft.title, "   ", "invalid patch is rejected atomically");
});
test("create, edit, complete, and delete update the chosen date and keep unrelated data", () => {
  const { store, storage } = environment();
  draft(store, { title: "  入学咨询  ", note: "  自己确认  " }); const first = store.savePreparationReminder();
  assert.ok(first); assert.equal(store.usePreparationState().reminders[0].title, "入学咨询");
  assert.equal(store.usePreparationState().reminders[0].note, "自己确认");
  assert.equal(store.usePreparationState().draft.title, "");
  draft(store, { title: "日常安排" }); const second = store.savePreparationReminder();
  store.togglePreparationReminder(first); assert.equal(store.editPreparationReminder(first), true);
  store.updatePreparationDraft({ date: "2026-12-01" }); assert.equal(store.savePreparationReminder(), first);
  const saved = store.usePreparationState().reminders.find(item => item.id === first);
  assert.equal(saved.date, "2026-12-01"); assert.equal(saved.done, true);
  assert.equal(environment(storage).store.usePreparationState().reminders.length, 2);
  assert.equal(store.deletePreparationReminder(first), true);
  assert.deepEqual(store.usePreparationState().reminders.map(item => item.id), [second]);
  assert.equal(store.deletePreparationReminder(first), false); assert.equal(store.editPreparationReminder(first), false);
});
test("cancelling an edit preserves the saved record, deleting the edited item clears its draft", () => {
  const { store } = environment(); draft(store); const id = store.savePreparationReminder();
  store.editPreparationReminder(id); store.updatePreparationDraft({ title: "未保存的修改" }); store.cancelPreparationDraft();
  assert.equal(store.usePreparationState().reminders[0].title, "学校安排确认");
  store.editPreparationReminder(id); store.deletePreparationReminder(id);
  assert.equal(store.usePreparationState().draft.editingId, null); assert.equal(store.usePreparationState().draft.title, "");
});
test("date count limit permits editing at capacity, refusing a new date without losing the draft", () => {
  const { store } = environment();
  for (let i = 0; i < store.MAX_PREPARATION_REMINDERS; i++) { draft(store, { title: `安排 ${i}` }); assert.ok(store.savePreparationReminder()); }
  draft(store, { title: "第 21 条" }); assert.equal(store.savePreparationReminder(), null);
  assert.equal(store.usePreparationState().draft.title, "第 21 条");
  const id = store.usePreparationState().reminders[0].id;
  store.editPreparationReminder(id); store.updatePreparationDraft({ title: "修改已有事项" }); assert.equal(store.savePreparationReminder(), id);
  assert.equal(store.usePreparationState().reminders.length, 20);
});
test("schema validation rejects unknown tasks, invalid dates, duplicate IDs, and stale editing references", () => {
  const { store } = environment(); draft(store); store.savePreparationReminder(); const state = store.usePreparationState();
  for (const bad of [
    { ...state, version: 2 }, { ...state, completed: ["fake-progress"] },
    { ...state, reminders: [{ ...state.reminders[0], date: "2026-02-31" }] },
    { ...state, reminders: [state.reminders[0], state.reminders[0]] },
    { ...state, draft: { ...state.draft, editingId: "reminder-missing" } },
  ]) assert.throws(() => store.parsePreparationState(JSON.stringify(bad)));
});
test("read-before-write preserves another tab's independent task and date edits", () => {
  const storage = memoryStorage(); const one = environment(storage).store; const two = environment(storage).store;
  one.usePreparationState(); two.usePreparationState();
  one.togglePreparationItem("before-questions"); two.togglePreparationItem("arrival-next");
  draft(one); one.savePreparationReminder(); two.togglePreparationItem("daily-review");
  const state = environment(storage).store.usePreparationState();
  assert.deepEqual(state.completed, ["before-questions", "arrival-next", "daily-review"]); assert.equal(state.reminders.length, 1);
});
test("storage events synchronize only the correct key and storage area", () => {
  const env = environment(); const { store, storage } = env; store.usePreparationState();
  storage.setItem(store.PREPARATION_STORAGE_KEY, JSON.stringify({ ...store.usePreparationState(), completed: ["before-questions"] }));
  env.event({ key: "studentpath:home:v2" }); assert.deepEqual(store.usePreparationState().completed, []);
  env.event({ key: store.PREPARATION_STORAGE_KEY, storageArea: {} }); assert.deepEqual(store.usePreparationState().completed, []);
  env.event({ key: store.PREPARATION_STORAGE_KEY }); assert.deepEqual(store.usePreparationState().completed, ["before-questions"]);
});
test("corrupt stored data stays untouched while accepted actions continue in memory", () => {
  const key = "studentpath:preparation:v1"; const storage = memoryStorage({ [key]: "broken bytes", "studentpath:home:v2": "profile data" });
  const { store } = environment(storage); assert.equal(store.usePreparationState().storageUnavailable, true);
  store.togglePreparationItem("before-questions"); draft(store); assert.ok(store.savePreparationReminder());
  assert.deepEqual(store.usePreparationState().completed, ["before-questions"]);
  assert.equal(storage.getItem(key), "broken bytes"); assert.equal(storage.getItem("studentpath:home:v2"), "profile data"); assert.equal(storage.writes.length, 0);
});
test("quota failure and a blocked localStorage getter both retain accepted records in memory", () => {
  const storage = memoryStorage(); storage.setItem = () => { throw new Error("quota"); };
  const quota = environment(storage).store;
  quota.togglePreparationItem("daily-review"); draft(quota); const id = quota.savePreparationReminder();
  assert.ok(id); assert.equal(quota.usePreparationState().storageUnavailable, true); quota.togglePreparationReminder(id);
  assert.equal(quota.usePreparationState().reminders[0].done, true);
  const blocked = loadStore({ get localStorage() { throw new Error("blocked"); }, addEventListener() {} });
  blocked.usePreparationState(); draft(blocked); assert.ok(blocked.savePreparationReminder());
  assert.equal(blocked.usePreparationState().storageUnavailable, true);
});
