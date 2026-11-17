import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const compiled = { exports: {} };
const output = ts.transpileModule(readFileSync(new URL("../src/lib/home-reveal-state.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("exports", output)(compiled.exports);
const { getHomeRevealState } = compiled.exports;

test("chapters repeatedly enter from either edge when the reader scrolls down and back up", () => {
  const positions = [820, 600, 100, -620, -700, -620, 100, 600, 820, 600];
  const states = positions.map(top => getHomeRevealState({ top, bottom: top + 680 }, 800, false));
  assert.deepEqual(states, ["below", "visible", "visible", "visible", "above", "visible", "visible", "visible", "below", "visible"]);
});

test("a mobile chapter taller than the viewport stays readable throughout its middle", () => {
  for (const top of [500, 0, -200, -500, -850]) {
    assert.equal(getHomeRevealState({ top, bottom: top + 1000 }, 640, false), "visible");
  }
  assert.equal(getHomeRevealState({ top: -1000, bottom: 0 }, 640, false), "above");
});

test("the same 48px edge works from above and below without requiring a full visible section", () => {
  assert.equal(getHomeRevealState({ top: 752, bottom: 1432 }, 800, false), "below");
  assert.equal(getHomeRevealState({ top: 751, bottom: 1431 }, 800, false), "visible");
  assert.equal(getHomeRevealState({ top: -631, bottom: 49 }, 800, false), "visible");
  assert.equal(getHomeRevealState({ top: -632, bottom: 48 }, 800, false), "above");
});

test("reduced motion shows every section regardless of scroll position", () => {
  for (const top of [-1600, -680, 0, 800, 1800]) {
    assert.equal(getHomeRevealState({ top, bottom: top + 680 }, 800, true), "visible");
  }
});
