import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = { exports: {} };
  cache.set(filename, compiled);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = name => load(name.startsWith("@/")
    ? resolve(root, "src", `${name.slice(2)}.ts`)
    : resolve(dirname(filename), `${name}.ts`));
  new Function("require", "module", "exports", output)(require, compiled, compiled.exports);
  return compiled.exports;
}
const { getGuideProgress } = load(resolve(root, "src/lib/guide-progress.ts"));
const steps = Object.freeze([
  Object.freeze({ id: "confirm", legacyIndex: 0 }),
  Object.freeze({ id: "prepare", legacyIndex: 1 }),
  Object.freeze({ id: "follow-up", legacyIndex: 2 }),
]);

test("an unopened guide has no invented completion and an empty guide is safe", () => {
  assert.deepEqual(getGuideProgress(steps, []), {
    completed: 0, total: 3, percent: 0,
    pendingIds: ["confirm", "prepare", "follow-up"], completedIds: [],
  });
  assert.deepEqual(getGuideProgress([], [0, 1, 2]), {
    completed: 0, total: 0, percent: 0, pendingIds: [], completedIds: [],
  });
});

test("legacy marks stay attached to their stable step ids after reordering or translation", () => {
  const marks = Object.freeze([0, 2]);
  const translatedAndReordered = [...steps].reverse().map(step => ({ ...step, title: { zh: "步骤", ru: "Шаг" } }));
  const before = getGuideProgress(steps, marks);
  const after = getGuideProgress(translatedAndReordered, marks);
  assert.equal(before.completed, 2);
  assert.equal(after.completed, before.completed);
  assert.equal(after.percent, 67);
  assert.deepEqual(new Set(after.completedIds), new Set(["confirm", "follow-up"]));
  assert.deepEqual(after.pendingIds, ["prepare"]);
  assert.deepEqual(marks, [0, 2]);
  assert.deepEqual(steps.map(step => step.legacyIndex), [0, 1, 2]);
});

test("completion and undo are derived only from the supplied current guide marks", () => {
  const all = getGuideProgress(steps, [0, 1, 2]);
  const undone = getGuideProgress(steps, [1, 2]);
  assert.equal(all.percent, 100);
  assert.equal(all.completed, 3);
  assert.deepEqual(all.pendingIds, []);
  assert.equal(undone.percent, 67);
  assert.deepEqual(undone.pendingIds, ["confirm"]);
  assert.equal(getGuideProgress(steps, [1]).percent, 33);
});

test("duplicate, obsolete and invalid numeric marks cannot inflate completion", () => {
  const marks = Object.freeze([0, 0, 2, 2, -1, 3, 1.5, NaN, Infinity]);
  const result = getGuideProgress(steps, marks);
  assert.equal(result.completed, 2);
  assert.equal(result.total, 3);
  assert.equal(result.percent, 67);
  assert.deepEqual(result.completedIds, ["confirm", "follow-up"]);
  assert.deepEqual(getGuideProgress(steps.slice(1), [0]).completedIds, []);
});

test("malformed duplicate definitions cannot create a second task for one legacy mark", () => {
  const malformed = [...steps,
    { id: "confirm", legacyIndex: 1 },
    { id: "another", legacyIndex: 0 },
    { id: "future", legacyIndex: 3 },
    { id: "fraction", legacyIndex: 1.5 },
    { id: "", legacyIndex: 1 },
  ];
  assert.deepEqual(getGuideProgress(malformed, [0, 1, 2, 3]), getGuideProgress(steps, [0, 1, 2]));
});

const { guidePreviews } = load(resolve(root, "src/data/home-content.ts"));
const { getGuideReaderContent } = load(resolve(root, "src/data/guide-reader-content.ts"));

// This contract ties existing home:v2 marks to task identities, not display order.
const legacyIds = {
  "visa-extension": ["confirm-process", "prepare-documents", "check-follow-up"],
  "residence-registration": ["confirm-host", "confirm-registration-documents", "check-registration-result"],
  "medical-examination": ["confirm-applicability", "confirm-appointment-documents", "confirm-result-handover"],
  "bank-card": ["confirm-bank-service", "review-bank-requirements", "save-bank-instructions"],
  "university-admission": ["find-programme", "review-admission-notice", "save-admission-answer"],
  "first-week": ["contact-reception", "organize-first-week", "save-first-week-plan"],
  "public-transport": ["check-route", "check-fare", "check-service-changes"],
};

test("all seven existing guides preserve the meaning of every home:v2 completion mark", () => {
  const allIds = new Set();
  for (const [guideId, suffixes] of Object.entries(legacyIds)) {
    const guide = guidePreviews.find(item => item.id === guideId);
    assert.ok(guide, `existing guide ${guideId} must remain available`);
    const content = getGuideReaderContent(guide);
    assert.equal(content.steps.length, 3, guideId);
    assert.deepEqual(content.steps.map(step => step.legacyIndex).sort(), [0, 1, 2], guideId);
    for (const [legacyIndex, suffix] of suffixes.entries()) {
      const id = `${guideId}-${suffix}`;
      const step = content.steps.find(item => item.id === id);
      assert.ok(step, `saved identity ${id} must remain available`);
      assert.equal(step.legacyIndex, legacyIndex, id);
      assert.deepEqual(step.description, guide.steps[legacyIndex], id);
      assert.ok(!allIds.has(id), `duplicate task identity ${id}`);
      allIds.add(id);
      assert.deepEqual(getGuideProgress([...content.steps].reverse(), [legacyIndex]).completedIds, [id]);
    }
    const reordered = [...content.steps].reverse();
    assert.equal(getGuideProgress(reordered, [0, 2, 2, 3]).percent, 67, guideId);
    assert.equal(getGuideProgress(reordered, []).percent, 0, guideId);
  }
  assert.equal(allIds.size, 21);
});

test("reader content is available in both languages without changing task identities", () => {
  function bilingual(value, label) {
    for (const locale of ["zh", "ru"]) {
      assert.equal(typeof value?.[locale], "string", `${label}.${locale}`);
      assert.ok(value[locale].trim(), `${label}.${locale} cannot be empty`);
    }
  }
  for (const guide of guidePreviews) {
    const content = getGuideReaderContent(guide);
    bilingual(content.author.name, `${guide.id}.author.name`);
    bilingual(content.author.role, `${guide.id}.author.role`);
    assert.ok(content.slides.length > 0, `${guide.id} needs a gallery slide`);
    assert.equal(new Set(content.slides.map(slide => slide.id)).size, content.slides.length);
    for (const slide of content.slides) {
      bilingual(slide.title, `${slide.id}.title`);
      bilingual(slide.caption, `${slide.id}.caption`);
    }
    for (const step of content.steps) {
      for (const field of ["title", "description", "annotation"]) bilingual(step[field], `${step.id}.${field}`);
      assert.ok(step.materials.length > 0, `${step.id} needs preparation guidance`);
      for (const material of step.materials) bilingual(material, `${step.id}.material`);
      for (const source of step.sources ?? []) bilingual(source.label, `${step.id}.source`);
    }
    const localized = locale => content.steps.map(step => ({ ...step, title: step.title[locale] }));
    assert.deepEqual(getGuideProgress(localized("zh"), [1]), getGuideProgress(localized("ru"), [1]));
  }
});
