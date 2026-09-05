import { test } from "node:test";
import assert from "node:assert/strict";
import { computeWeekScore, labelForScore, computeReviewStreak } from "./score.ts";

test("computeWeekScore is 0 with no active habits (no division by zero)", () => {
  const result = computeWeekScore([]);
  assert.equal(result.score, 0);
  assert.equal(result.label, "Rough week");
  assert.deepEqual(result.breakdown, []);
  assert.equal(result.biggestIssue, null);
});

test("computeWeekScore weights by how often a habit is scheduled, not equally per habit", () => {
  // Habit A scheduled 6x/week, all done. Habit B scheduled 1x/week, missed.
  // Overall: 6 done / 7 scheduled = 86%, not the 50% a per-habit average would give.
  const result = computeWeekScore([
    { habitId: "a", name: "Deep work", scheduledDays: 6, doneDays: 6 },
    { habitId: "b", name: "Uncomfortable rep", scheduledDays: 1, doneDays: 0 },
  ]);
  assert.equal(result.score, 86);
  assert.equal(result.label, "Strong week");
});

test("computeWeekScore breakdown gives each habit its own %, and flags the worst as biggestIssue", () => {
  const result = computeWeekScore([
    { habitId: "a", name: "Workout", scheduledDays: 7, doneDays: 7 },
    { habitId: "b", name: "Read", scheduledDays: 7, doneDays: 3 },
  ]);
  assert.deepEqual(result.breakdown, [
    { habitId: "a", name: "Workout", pct: 100 },
    { habitId: "b", name: "Read", pct: 43 },
  ]);
  assert.equal(result.biggestIssue, "Read (43%)");
});

test("computeWeekScore has no biggestIssue when every habit hit 100%", () => {
  const result = computeWeekScore([{ habitId: "a", name: "Workout", scheduledDays: 7, doneDays: 7 }]);
  assert.equal(result.score, 100);
  assert.equal(result.biggestIssue, null);
});

test("computeWeekScore ignores a habit scheduled zero days that week for the breakdown/biggestIssue calc", () => {
  const result = computeWeekScore([
    { habitId: "a", name: "Workout", scheduledDays: 7, doneDays: 7 },
    { habitId: "b", name: "New habit", scheduledDays: 0, doneDays: 0 },
  ]);
  assert.equal(result.breakdown.find((r) => r.habitId === "b")?.pct, 0);
  assert.equal(result.biggestIssue, null); // the 0-scheduled habit isn't a real "issue"
});

test("labelForScore bands", () => {
  assert.equal(labelForScore(100), "Excellent week");
  assert.equal(labelForScore(90), "Excellent week");
  assert.equal(labelForScore(89), "Strong week");
  assert.equal(labelForScore(75), "Strong week");
  assert.equal(labelForScore(74), "Uneven week");
  assert.equal(labelForScore(50), "Uneven week");
  assert.equal(labelForScore(49), "Rough week");
  assert.equal(labelForScore(0), "Rough week");
});

test("computeReviewStreak counts consecutive closed weeks back from the current week", () => {
  const closed = new Set(["2026-08-31", "2026-08-24", "2026-08-17"]);
  assert.equal(computeReviewStreak(closed, "2026-08-31"), 3);
});

test("computeReviewStreak: current week not closed yet doesn't break or count the streak", () => {
  const closed = new Set(["2026-08-24", "2026-08-17"]);
  // 2026-08-31 (this week) isn't in the set yet, but the streak from last week still shows.
  assert.equal(computeReviewStreak(closed, "2026-08-31"), 2);
});

test("computeReviewStreak stops at the first gap", () => {
  const closed = new Set(["2026-08-31", "2026-08-17"]); // 2026-08-24 missing
  assert.equal(computeReviewStreak(closed, "2026-08-31"), 1);
});

test("computeReviewStreak: an auto-closed week (excluded from the set) breaks the streak", () => {
  const closed = new Set(["2026-08-31"]); // 2026-08-24 was auto-closed, so it's not in this set
  assert.equal(computeReviewStreak(closed, "2026-08-31"), 1);
});

test("computeReviewStreak is 0 with no closed weeks at all", () => {
  assert.equal(computeReviewStreak(new Set(), "2026-08-31"), 0);
});
