import { test } from "node:test";
import assert from "node:assert/strict";
import { computeWeekScore, labelForScore, computeReviewStreak } from "./score.ts";

test("computeWeekScore is 0 with no to-dos that week (no division by zero)", () => {
  const result = computeWeekScore([]);
  assert.equal(result.score, 0);
  assert.equal(result.label, "Rough week");
  assert.deepEqual(result.breakdown, []);
  assert.equal(result.biggestIssue, null);
});

test("computeWeekScore weights by how many to-dos a day had, not equally per day", () => {
  // Monday had 6 to-dos, all done. Tuesday had 1, missed.
  // Overall: 6 done / 7 total = 86%, not the 50% a per-day average would give.
  const result = computeWeekScore([
    { date: "2026-09-21", total: 6, done: 6 },
    { date: "2026-09-22", total: 1, done: 0 },
  ]);
  assert.equal(result.score, 86);
  assert.equal(result.label, "Strong week");
});

test("computeWeekScore breakdown gives each day its own %, and flags the worst as biggestIssue", () => {
  const result = computeWeekScore([
    { date: "2026-09-21", total: 7, done: 7 },
    { date: "2026-09-22", total: 7, done: 3 },
  ]);
  assert.deepEqual(result.breakdown, [
    { date: "2026-09-21", label: "Mon", pct: 100 },
    { date: "2026-09-22", label: "Tue", pct: 43 },
  ]);
  assert.equal(result.biggestIssue, "Tue (43%)");
});

test("computeWeekScore has no biggestIssue when every day hit 100%", () => {
  const result = computeWeekScore([{ date: "2026-09-21", total: 7, done: 7 }]);
  assert.equal(result.score, 100);
  assert.equal(result.biggestIssue, null);
});

test("computeWeekScore ignores a day with zero to-dos for the breakdown/biggestIssue calc", () => {
  const result = computeWeekScore([
    { date: "2026-09-21", total: 7, done: 7 },
    { date: "2026-09-22", total: 0, done: 0 },
  ]);
  assert.equal(result.breakdown.find((r) => r.date === "2026-09-22")?.pct, 0);
  assert.equal(result.biggestIssue, null); // a day with nothing planned isn't a real "issue"
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
