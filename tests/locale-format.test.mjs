import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/locale-format.ts", import.meta.url), "utf8");
const compiled = { exports: {} };
new Function("exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(compiled.exports);
const { formatCalendarDate } = compiled.exports;

test("calendar dates follow Chinese and Russian reading formats", () => {
  assert.equal(formatCalendarDate("2026-11-17", "zh"), "2026年11月17日");
  assert.equal(formatCalendarDate("2026-11-17", "ru"), "17.11.2026");
  assert.equal(formatCalendarDate("2028-02-29", "ru"), "29.02.2028");
});

test("timezone changes never move a personal date to another day", () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ["America/Los_Angeles", "Pacific/Kiritimati", "Europe/Moscow", "Asia/Shanghai"]) {
      process.env.TZ = timezone;
      assert.equal(formatCalendarDate("2026-01-01", "zh"), "2026年1月1日", timezone);
      assert.equal(formatCalendarDate("2026-01-01", "ru"), "01.01.2026", timezone);
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});
