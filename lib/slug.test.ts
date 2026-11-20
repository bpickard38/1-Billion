import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, uniqueSlug } from "./slug.ts";

test("slugify makes lowercase dash-separated words", () => {
  assert.equal(slugify("Morning"), "morning");
  assert.equal(slugify("  Learning New Skills! "), "learning-new-skills");
  assert.equal(slugify("Café & Business"), "cafe-business");
});

test("slugify never returns an empty or reserved slug", () => {
  assert.equal(slugify("!!!"), "system");
  assert.equal(slugify("History"), "history-system");
  assert.equal(slugify("New"), "new-system");
});

test("uniqueSlug adds -2, -3 when taken", () => {
  assert.equal(uniqueSlug("School", new Set()), "school");
  assert.equal(uniqueSlug("School", new Set(["school"])), "school-2");
  assert.equal(uniqueSlug("School", new Set(["school", "school-2"])), "school-3");
});
