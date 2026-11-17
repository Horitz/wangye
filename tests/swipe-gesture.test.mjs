import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const output = ts.transpileModule(readFileSync(new URL("../src/lib/swipe-gesture.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const gestureModule = { exports: {} };
new Function("module", "exports", output)(gestureModule, gestureModule.exports);
const { getSwipeAxis, resolveSwipeIndex, getSwipeOffset } = gestureModule.exports;

test("vertical reading and tiny or ambiguous movements do not become horizontal swipes", () => {
  assert.equal(getSwipeAxis(3, 5), null);
  assert.equal(getSwipeAxis(25, 25), null);
  assert.equal(getSwipeAxis(8, 40), "vertical");
  assert.equal(getSwipeAxis(12, -30), "vertical");
  assert.equal(getSwipeAxis(-50, 9), "horizontal");
  assert.equal(getSwipeAxis(50, 9), "horizontal");
});

test("short drags rebound, intentional left/right drags advance exactly one image", () => {
  assert.equal(resolveSwipeIndex(1, 4, -20, 360), 1);
  assert.equal(resolveSwipeIndex(1, 4, -60, 360), 2);
  assert.equal(resolveSwipeIndex(1, 4, 60, 360), 0);
  assert.equal(resolveSwipeIndex(1, 4, -900, 800), 2);
  assert.equal(resolveSwipeIndex(1, 4, -40, 200), 2);
});

test("first/last images stay at their boundaries and empty/single collections are safe", () => {
  assert.equal(resolveSwipeIndex(0, 4, 100, 360), 0);
  assert.equal(resolveSwipeIndex(3, 4, -100, 360), 3);
  assert.equal(resolveSwipeIndex(0, 1, -100, 360), 0);
  assert.equal(resolveSwipeIndex(0, 0, -100, 360), 0);
  assert.equal(resolveSwipeIndex(7, 2, -100, 360), 1);
  assert.equal(resolveSwipeIndex(1, 4, -100, 0), 1);
});

test("boundary feedback is resisted and cannot expose an unbounded empty track", () => {
  assert.equal(getSwipeOffset(0, 3, 100, 360), 25);
  assert.equal(getSwipeOffset(2, 3, -100, 360), -25);
  assert.equal(getSwipeOffset(0, 3, 1000, 360), 48);
  assert.equal(getSwipeOffset(1, 3, -1000, 360), -360);
  assert.equal(getSwipeOffset(0, 1, 100, 360), 0);
});
