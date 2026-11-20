import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildOverviewMonth,
  completionRate,
  formatDays,
  isTimeOfDay,
  parseDay,
  parseMonth,
  shiftMonth,
} from "./systems.ts";

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

test("buildOverviewMonth combines systems per day", () => {
  const morning = { doneDates: new Set(["2026-11-16", "2026-11-17", "2026-11-19"]), daysOfWeek: [1, 2, 3, 4, 5, 6, 7], startDate: "2026-11-01" };
  const school = { doneDates: new Set(["2026-11-16", "2026-11-22"]), daysOfWeek: WEEKDAYS, startDate: "2026-11-01" };
  const week = buildOverviewMonth("2026-11", [morning, school], "2026-11-20")[3];
  assert.deepEqual(
    week.map((c) => c?.state),
    // Mon both, Tue morning only, Wed none, Thu morning only, Fri (today) none yet, Sat/Sun future
    ["all", "some", "none", "some", "none", "future", "future"]
  );
});

test("buildOverviewMonth: days with nothing scheduled are off, unless something was done", () => {
  const school = { doneDates: new Set(["2026-11-15"]), daysOfWeek: WEEKDAYS, startDate: "2026-11-01" };
  const week = buildOverviewMonth("2026-11", [school], "2026-11-30")[2];
  assert.equal(week[5]?.state, "off"); // Sat 14
  assert.equal(week[6]?.state, "all"); // Sun 15, bonus
});

test("parseDay clamps to today and rejects junk", () => {
  assert.equal(parseDay("2026-11-18", "2026-11-19"), "2026-11-18");
  assert.equal(parseDay("2026-12-01", "2026-11-19"), "2026-11-19");
  assert.equal(parseDay("2026-13-45", "2026-11-19"), "2026-11-19");
  assert.equal(parseDay(undefined, "2026-11-19"), "2026-11-19");
});
