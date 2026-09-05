import { test } from "node:test";
import assert from "node:assert/strict";
import { parentLevelOf, buildChainFromMap, computeProgressPct } from "./goals.ts";

test("parentLevelOf: each level's parent is the level above; dream has none", () => {
  assert.equal(parentLevelOf("dream"), null);
  assert.equal(parentLevelOf("10yr"), "dream");
  assert.equal(parentLevelOf("quarter"), "1yr");
  assert.equal(parentLevelOf("today"), "week");
});

test("buildChainFromMap walks parent_id from a leaf goal up to the Dream", () => {
  const goalsById = new Map([
    ["dream", { id: "dream", title: "Build a billion-dollar company", level: "dream", parent_id: null }],
    ["1yr", { id: "1yr", title: "$10k+ MRR", level: "1yr", parent_id: "dream" }],
    ["week", { id: "week", title: "5 interviews this week", level: "week", parent_id: "1yr" }],
  ]);

  assert.deepEqual(buildChainFromMap(goalsById, "week"), [
    { id: "week", title: "5 interviews this week", level: "week" },
    { id: "1yr", title: "$10k+ MRR", level: "1yr" },
    { id: "dream", title: "Build a billion-dollar company", level: "dream" },
  ]);
});

test("buildChainFromMap returns an empty chain for a null or unknown goal id", () => {
  const goalsById = new Map();
  assert.deepEqual(buildChainFromMap(goalsById, null), []);
  assert.deepEqual(buildChainFromMap(goalsById, "missing"), []);
});

test("computeProgressPct rounds done/total to a percentage, and is 0 with no children", () => {
  assert.equal(computeProgressPct(0, 0), 0);
  assert.equal(computeProgressPct(1, 3), 33);
  assert.equal(computeProgressPct(2, 3), 67);
  assert.equal(computeProgressPct(4, 4), 100);
});
