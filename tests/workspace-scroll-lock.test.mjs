import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const compiled = { exports: {} };
const output = ts.transpileModule(readFileSync(new URL("../src/lib/workspace-scroll-lock.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("exports", output)(compiled.exports);
const { lockWorkspaceScroll } = compiled.exports;

test("closing a guide preserves its preparation dialog's background lock", () => {
  const style = { overflow: "auto" };
  const closePreparation = lockWorkspaceScroll(style);
  const closeGuide = lockWorkspaceScroll(style);
  assert.equal(style.overflow, "hidden");
  closeGuide();
  assert.equal(style.overflow, "hidden");
  closePreparation();
  assert.equal(style.overflow, "auto");
});

test("route cleanup can remove the underlying dialog first without leaking a lock", () => {
  const style = { overflow: "" };
  const closePreparation = lockWorkspaceScroll(style);
  const closeGuide = lockWorkspaceScroll(style);
  closePreparation();
  assert.equal(style.overflow, "hidden");
  closeGuide();
  assert.equal(style.overflow, "");
});

test("duplicate effect cleanup cannot release a still-open dialog", () => {
  const style = { overflow: "scroll" };
  const first = lockWorkspaceScroll(style);
  const second = lockWorkspaceScroll(style);
  first();
  first();
  assert.equal(style.overflow, "hidden");
  second();
  assert.equal(style.overflow, "scroll");
});

test("a new opening captures the current style after the previous stack has closed", () => {
  const style = { overflow: "" };
  lockWorkspaceScroll(style)();
  style.overflow = "clip";
  lockWorkspaceScroll(style)();
  assert.equal(style.overflow, "clip");
});
