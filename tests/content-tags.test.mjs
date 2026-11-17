import test from "node:test";
import assert from "node:assert/strict";
import { MAX_CONTENT_TAGS, MAX_TAG_LENGTH, normalizeTag, tagKey, normalizeTags, parseContentTags } from "../src/lib/content-tags.mjs";

test("tags normalize Unicode, leading hashes and spacing while preserving display case", () => {
  assert.equal(normalizeTag("  ＃＃  ＭＧＵ\t  校园  "), "MGU 校园");
  assert.equal(normalizeTag("# # Москва\n  летом"), "Москва летом");
  assert.equal(normalizeTag("  #  "), "");
  assert.equal(normalizeTag("课后 #日常"), "课后 #日常");
  assert.equal(tagKey(" ＃ МОСКВА "), tagKey("москва"));
  assert.equal(tagKey("#ＥＮ"), tagKey("en"));
  assert.equal(normalizeTag("Cafe\u0301"), "Café");
});

test("normalization deduplicates before the eight-tag limit and never mutates source values", () => {
  const input = [" ＃МГУ ", "мгу", "# 校园", "校园", "", " ", "#", "Прогулки"];
  const before = [...input];
  assert.deepEqual(normalizeTags(input), ["МГУ", "校园", "Прогулки"]);
  assert.deepEqual(input, before);
  const limit = Array.from({ length: MAX_CONTENT_TAGS }, (_, index) => `Tag ${index}`);
  assert.deepEqual(normalizeTags([...limit, ...limit.map(tag => tag.toLowerCase())]), limit);
  assert.throws(() => normalizeTags([...limit, "第九个标签"]), /too_many_tags/);
});

test("tag length counts Unicode code points after normalization", () => {
  assert.equal(normalizeTag(` # ${"🚀".repeat(MAX_TAG_LENGTH)} `), "🚀".repeat(MAX_TAG_LENGTH));
  assert.equal(normalizeTag("校".repeat(MAX_TAG_LENGTH)), "校".repeat(MAX_TAG_LENGTH));
  assert.throws(() => normalizeTag("🚀".repeat(MAX_TAG_LENGTH + 1)), /tag_too_long/);
  assert.throws(() => normalizeTag("я".repeat(MAX_TAG_LENGTH + 1)), /tag_too_long/);
});

test("boundary parsing only accepts arrays of strings and returns a detached normalized array", () => {
  for (const value of [undefined, null, "校园", 1, {}, [1], [null], ["ok", {}], ["has\0nul"]]) assert.throws(() => parseContentTags(value), /invalid_tags/);
  const original = ["#校园"];
  const parsed = parseContentTags(original);
  parsed.push("Москва");
  assert.deepEqual(original, ["#校园"]);
  assert.deepEqual(parseContentTags([]), []);
});
