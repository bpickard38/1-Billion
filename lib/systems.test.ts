import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMonth, completionRate, formatDays, isTimeOfDay, parseMonth, shiftMonth } from "./systems.ts";

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

// 2026-11-19 is a Thursday. November 2026 starts on a Sunday.
test("buildMonth lays the month out Monday-first with padding", () => {
  const rows = buildMonth("2026-11", new Set(), WEEKDAYS, "2026-11-19", "2026-01-01");
  assert.ok(rows.every((r) => r.length === 7));
  assert.equal(rows.length, 6);
  assert.deepEqual(rows[0].slice(0, 6), [null, null, null, null, null, null]);
  assert.equal(rows[0][6]?.date, "2026-11-01");
  assert.equal(rows[5][0]?.date, "2026-11-30");
  assert.equal(rows[5][1], null);
});

test("buildMonth marks done, missed, off, before and future", () => {
  const done = new Set(["2026-11-16", "2026-11-19"]);
  const week = buildMonth("2026-11", done, WEEKDAYS, "2026-11-19", "2026-11-17")[3];
  assert.deepEqual(
    week.map((c) => c?.state),
    // Mon 16 done (even before start), Tue/Wed missed, Thu (today) done, Fri-Sun future
    ["done", "missed", "missed", "done", "future", "future", "future"]
  );
  const lastWeek = buildMonth("2026-11", new Set(), WEEKDAYS, "2026-11-19", "2026-11-12")[2];
  assert.deepEqual(
    lastWeek.map((c) => c?.state),
    ["before", "before", "before", "missed", "missed", "off", "off"]
  );
});

test("shiftMonth crosses years and parseMonth rejects junk and future months", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(parseMonth("2026-10", "2026-11-19"), "2026-10");
  assert.equal(parseMonth("2027-01", "2026-11-19"), "2026-11");
  assert.equal(parseMonth("nope", "2026-11-19"), "2026-11");
  assert.equal(parseMonth(undefined, "2026-11-19"), "2026-11");
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
