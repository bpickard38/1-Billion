import { test } from "node:test";
import assert from "node:assert/strict";
import { getLocalDateString } from "./dates.ts";

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
