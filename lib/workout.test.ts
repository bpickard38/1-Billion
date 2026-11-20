import { test } from "node:test";
import assert from "node:assert/strict";
import { applyProgressions, formatTarget, parseSetValue, tutorialLink, type WorkoutPlan } from "./workout.ts";

test("formatTarget reads like a coach would write it", () => {
  assert.equal(formatTarget({ sets: 3, low: 6, high: 8, unit: "reps" }), "3 × 6-8 reps");
  assert.equal(formatTarget({ sets: 4, low: 20, high: 20, unit: "seconds" }), "4 × 20 s");
  assert.equal(formatTarget({ sets: 1, low: 25, high: 30, unit: "minutes" }), "25-30 min");
});

test("tutorialLink is a YouTube search", () => {
  assert.equal(
    tutorialLink("Planche lean"),
    "https://www.youtube.com/results?search_query=Planche%20lean%20tutorial"
  );
});

test("parseSetValue accepts whole numbers only", () => {
  assert.equal(parseSetValue(" 12 "), 12);
  assert.equal(parseSetValue("0"), 0);
  assert.equal(parseSetValue(""), null);
  assert.equal(parseSetValue("1.5"), null);
  assert.equal(parseSetValue("abc"), null);
});

const ex = (name: string, low: number, high: number) => ({ name, sets: 3, low, high, unit: "reps" as const, note: "" });
const plan: WorkoutPlan = {
  summary: "",
  tips: [],
  days: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
    day,
    title: "Day",
    minutes: 30,
    exercises: day % 2 ? [ex("Pike push-up", 6, 8), ex("Pull-up", 5, 7)] : [],
  })),
};

test("applyProgressions updates every day with that exercise and can swap variations", () => {
  const next = applyProgressions(plan, [
    { name: "pike push-up", sets: 4, low: 8, high: 10, newName: "" },
    { name: "Pull-up", sets: 3, low: 3, high: 5, newName: "Archer pull-up" },
  ]);
  for (const day of next.days.filter((d) => d.exercises.length)) {
    assert.deepEqual(
      day.exercises.map((e) => [e.name, e.sets, e.low, e.high]),
      [
        ["Pike push-up", 4, 8, 10],
        ["Archer pull-up", 3, 3, 5],
      ]
    );
  }
});

test("applyProgressions clamps bad numbers and keeps low <= high", () => {
  const next = applyProgressions(plan, [{ name: "Pull-up", sets: 20, low: 12, high: 9, newName: "" }]);
  const pull = next.days[0].exercises[1];
  assert.deepEqual([pull.sets, pull.low, pull.high], [6, 12, 12]);
});
