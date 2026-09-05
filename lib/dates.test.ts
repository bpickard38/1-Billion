import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getLocalDateString,
  getWeekStart,
  getWeekEnd,
  getWeekStartDateString,
  getLocalWeekday,
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
