import { test } from "node:test";
import assert from "node:assert/strict";
import { diffPlan, isArea, type PlannedTask } from "./areas.ts";

const task = (name: string): PlannedTask => ({ name, minutes: 60, days: [1], timeOfDay: null, details: "" });

test("diffPlan keeps same-named tasks, adds new ones, removes the rest", () => {
  const result = diffPlan(
    [
      { id: "a", name: "Write scripts" },
      { id: "b", name: "Film" },
    ],
    [task("write scripts"), task("Edit & post")]
  );
  assert.deepEqual(result.update.map((u) => [u.id, u.task.name]), [["a", "write scripts"]]);
  assert.deepEqual(result.insert.map((t) => t.name), ["Edit & post"]);
  assert.deepEqual(result.remove, ["b"]);
});

test("diffPlan inserts a duplicate name instead of updating the same task twice", () => {
  const result = diffPlan([{ id: "a", name: "Film" }], [task("Film"), task("Film")]);
  assert.equal(result.update.length, 1);
  assert.equal(result.insert.length, 1);
  assert.deepEqual(result.remove, []);
});

test("isArea", () => {
  assert.ok(isArea("content"));
  assert.ok(!isArea("exercise"));
});
