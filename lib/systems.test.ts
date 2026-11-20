import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHistory, completionRate, formatDays, isTimeOfDay } from "./systems.ts";

const WEEKDAYS = [1, 2, 3, 4, 5];

test("formatDays names the common patterns and lists the rest", () => {
  assert.equal(formatDays([1, 2, 3, 4, 5, 6, 7]), "Every day");
  assert.equal(formatDays([5, 4, 3, 2, 1]), "Weekdays");
  assert.equal(formatDays([7, 6]), "Weekends");
  assert.equal(formatDays([5, 1, 3]), "Mon, Wed, Fri");
});

test("isTimeOfDay accepts the three slots only", () => {
  assert.ok(isTimeOfDay("evening"));
  assert.ok(!isTimeOfDay("night"));
  assert.ok(!isTimeOfDay(null));
});

// 2026-11-19 is a Thursday.
test("buildHistory: 16 Monday-first columns ending in today's week", () => {
  const grid = buildHistory(new Set(), WEEKDAYS, "2026-11-19", "2026-01-01");
  assert.equal(grid.length, 16);
  assert.ok(grid.every((col) => col.length === 7));
  assert.equal(grid[15][0].date, "2026-11-16"); // Monday of this week
  assert.equal(grid[15][3].date, "2026-11-19"); // today
  assert.equal(grid[0][0].date, "2026-08-03");
});

test("buildHistory marks done, missed, off, before and future", () => {
  const done = new Set(["2026-11-16", "2026-11-19"]);
  const week = buildHistory(done, WEEKDAYS, "2026-11-19", "2026-11-17").at(-1)!;
  assert.deepEqual(
    week.map((c) => c.state),
    // Mon done (before start, still shows), Tue missed, Wed missed, Thu (today) done, Fri-Sun future
    ["done", "missed", "missed", "done", "future", "future", "future"]
  );
  const lastWeek = buildHistory(new Set(), WEEKDAYS, "2026-11-19", "2026-11-12").at(-2)!;
  assert.deepEqual(
    lastWeek.map((c) => c.state),
    ["before", "before", "before", "missed", "missed", "off", "off"]
  );
});

test("completionRate ignores unscheduled days and an unfinished today", () => {
  // Scheduled weekdays from Mon 11-16 to Wed 11-18 (today Thu 11-19 not done yet).
  const rate = completionRate(new Set(["2026-11-16", "2026-11-18"]), WEEKDAYS, "2026-11-19", "2026-11-16");
  assert.deepEqual(rate, { done: 2, scheduled: 3, pct: 67 });
});

test("completionRate counts today once it's done, and bonus days off-schedule", () => {
  const rate = completionRate(new Set(["2026-11-15", "2026-11-19"]), WEEKDAYS, "2026-11-19", "2026-11-15");
  // Sun 11-15 (off but done) + Mon-Wed missed + Thu done
  assert.deepEqual(rate, { done: 2, scheduled: 5, pct: 40 });
});

test("completionRate is null before any scheduled day has passed", () => {
  assert.equal(completionRate(new Set(), WEEKDAYS, "2026-11-19", "2026-11-19"), null);
});
