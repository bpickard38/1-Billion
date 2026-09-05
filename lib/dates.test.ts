import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getLocalDateString,
  getWeekStart,
  getWeekEnd,
  getWeekStartDateString,
  getLocalWeekday,
  localTimeToInstant,
  instantToLocalTimeString,
  localMinutesSinceMidnight,
  isAfterWeeklyReviewCutoff,
} from "./dates.ts";

const DENVER = "America/Denver";

test("getLocalDateString respects the Denver offset across a UTC midnight", () => {
  // 2026-09-05T04:00:00Z is still 2026-09-04 22:00 in Denver (MDT, UTC-6).
  assert.equal(
    getLocalDateString(new Date("2026-09-05T04:00:00Z"), DENVER),
    "2026-09-04"
  );
  // 2026-09-05T06:30:00Z has just crossed into 2026-09-05 00:30 in Denver.
  assert.equal(
    getLocalDateString(new Date("2026-09-05T06:30:00Z"), DENVER),
    "2026-09-05"
  );
});

test("a normal week resolves to Monday-Sunday (2026-09-04 is a Friday)", () => {
  const friday = new Date("2026-09-04T20:00:00Z");
  assert.equal(getWeekStartDateString(friday, DENVER), "2026-08-31");
  assert.equal(getLocalDateString(getWeekEnd(friday, DENVER), DENVER), "2026-09-06");
});

test("a Monday-00:00-local instant is its own week start", () => {
  // 2026-08-31T06:00:00Z = 2026-08-31 00:00 in Denver (MDT, UTC-6 in August).
  const mondayMidnight = new Date("2026-08-31T06:00:00Z");
  assert.equal(
    getWeekStart(mondayMidnight, DENVER).toISOString(),
    mondayMidnight.toISOString()
  );
});

test("week boundaries survive the spring-forward DST change (2026-03-08)", () => {
  // Week of Mon 2026-03-02 - Sun 2026-03-08; clocks skip 2:00-3:00 AM on the Sunday.
  const midweek = new Date("2026-03-04T12:00:00Z");
  assert.equal(getWeekStartDateString(midweek, DENVER), "2026-03-02");
  assert.equal(getLocalDateString(getWeekEnd(midweek, DENVER), DENVER), "2026-03-08");
  // Start of week is still on standard time (MST, UTC-7); end of week is on
  // daylight time (MDT, UTC-6) because the change lands inside the week.
  assert.equal(getWeekStart(midweek, DENVER).toISOString(), "2026-03-02T07:00:00.000Z");
});

test("week boundaries survive the fall-back DST change (2026-11-01)", () => {
  // Week of Mon 2026-10-26 - Sun 2026-11-01; clocks repeat 1:00-2:00 AM on the Sunday.
  const midweek = new Date("2026-10-28T12:00:00Z");
  assert.equal(getWeekStartDateString(midweek, DENVER), "2026-10-26");
  assert.equal(getLocalDateString(getWeekEnd(midweek, DENVER), DENVER), "2026-11-01");
  // Start of week is on daylight time (MDT, UTC-6); end of week is back on
  // standard time (MST, UTC-7) because the change lands inside the week.
  assert.equal(getWeekStart(midweek, DENVER).toISOString(), "2026-10-26T06:00:00.000Z");
});

test("getLocalWeekday: 1 = Monday ... 7 = Sunday (2026-09-04 is a Friday)", () => {
  assert.equal(getLocalWeekday(new Date("2026-08-31T20:00:00Z"), DENVER), 1);
  assert.equal(getLocalWeekday(new Date("2026-09-04T20:00:00Z"), DENVER), 5);
  assert.equal(getLocalWeekday(new Date("2026-09-06T20:00:00Z"), DENVER), 7);
});

test("localTimeToInstant converts a Denver wall-clock time to UTC (MDT, UTC-6)", () => {
  assert.equal(
    localTimeToInstant("2026-09-05", "06:30", DENVER).toISOString(),
    "2026-09-05T12:30:00.000Z"
  );
  // "HH:mm:ss" (Postgres `time` output) works the same as "HH:mm".
  assert.equal(
    localTimeToInstant("2026-09-05", "21:45:00", DENVER).toISOString(),
    "2026-09-06T03:45:00.000Z"
  );
});

test("localTimeToInstant and instantToLocalTimeString round-trip across the fall-back DST change", () => {
  // 2026-11-01 is standard time (MST, UTC-7) after clocks fall back at 2 AM.
  const instant = localTimeToInstant("2026-11-01", "09:00", DENVER);
  assert.equal(instant.toISOString(), "2026-11-01T16:00:00.000Z");
  assert.equal(instantToLocalTimeString(instant, DENVER), "09:00");
});

test("localMinutesSinceMidnight matches the Denver wall-clock time (MDT, UTC-6)", () => {
  assert.equal(localMinutesSinceMidnight("2026-09-05T12:30:00.000Z", DENVER), 6 * 60 + 30);
  assert.equal(localMinutesSinceMidnight("2026-09-05T06:00:00.000Z", DENVER), 0);
  assert.equal(localMinutesSinceMidnight("2026-09-05T05:59:00.000Z", DENVER), 23 * 60 + 59);
});

test("isAfterWeeklyReviewCutoff: false before Friday 5 PM local, true at and after it (2026-09-04 is a Friday, MDT UTC-6)", () => {
  assert.equal(isAfterWeeklyReviewCutoff(new Date("2026-09-04T22:59:00Z"), DENVER), false); // 4:59 PM Denver
  assert.equal(isAfterWeeklyReviewCutoff(new Date("2026-09-04T23:00:00Z"), DENVER), true); // 5:00 PM Denver
  assert.equal(isAfterWeeklyReviewCutoff(new Date("2026-09-04T23:59:00Z"), DENVER), true); // 5:59 PM Denver
});

test("isAfterWeeklyReviewCutoff: true all through Saturday and Sunday, false Monday-Thursday", () => {
  assert.equal(isAfterWeeklyReviewCutoff(new Date("2026-09-05T13:00:00Z"), DENVER), true); // Saturday morning
  assert.equal(isAfterWeeklyReviewCutoff(new Date("2026-09-06T23:00:00Z"), DENVER), true); // Sunday night
  assert.equal(isAfterWeeklyReviewCutoff(new Date("2026-08-31T13:00:00Z"), DENVER), false); // Monday
  assert.equal(isAfterWeeklyReviewCutoff(new Date("2026-09-03T23:59:00Z"), DENVER), false); // Thursday night
});
