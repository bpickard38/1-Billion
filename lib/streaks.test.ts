import { test } from "node:test";
import assert from "node:assert/strict";
import { computeHabitStreak } from "./streaks.ts";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const WEEKDAYS = [1, 2, 3, 4, 5];

// 2026-09-04 is a Friday; 2026-08-31 the preceding Monday; 2026-08-28 the
// Friday before that.
const FRIDAY = "2026-09-04";

test("counts consecutive done days back to the first miss", () => {
  const done = new Set(["2026-09-04", "2026-09-03", "2026-09-02", "2026-09-01", "2026-08-31"]);
  // 2026-08-30 (Sunday) is scheduled (every day) and not done -> breaks here.
  assert.equal(computeHabitStreak(done, ALL_DAYS, FRIDAY), 5);
});

test("skips non-scheduled days without breaking the streak", () => {
  const done = new Set(["2026-09-04", "2026-09-03", "2026-09-02", "2026-09-01", "2026-08-31"]);
  // Sat/Sun aren't scheduled for a weekdays-only habit, so they're skipped;
  // the previous Friday (2026-08-28) isn't done, so the streak stops there.
  assert.equal(computeHabitStreak(done, WEEKDAYS, FRIDAY), 5);
});

test("today not done yet doesn't break the streak, and doesn't count either", () => {
  const done = new Set(["2026-09-03", "2026-09-02"]);
  assert.equal(computeHabitStreak(done, ALL_DAYS, FRIDAY), 2);
});

test("today done adds one to the streak", () => {
  const done = new Set(["2026-09-04", "2026-09-03"]);
  assert.equal(computeHabitStreak(done, ALL_DAYS, FRIDAY), 2);
});

test("no logged days at all is a zero streak", () => {
  assert.equal(computeHabitStreak(new Set(), ALL_DAYS, FRIDAY), 0);
});
