import { test } from "node:test";
import assert from "node:assert/strict";
import { materializeBlocks, currentAndNextBlock } from "./schedule.ts";

const DENVER = "America/Denver";

test("materializeBlocks converts weekday-local template times to UTC instants for the given date", () => {
  const rows = materializeBlocks(
    [
      { start_time: "06:30:00", end_time: "07:00:00", title: "Prayer", category: "Faith/Family" },
      { start_time: "16:00:00", end_time: "18:00:00", title: "Outbound", category: "Startup-Customers" },
    ],
    "2026-09-05",
    DENVER
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, "2026-09-05");
  assert.equal(rows[0].start_at, "2026-09-05T12:30:00.000Z");
  assert.equal(rows[0].end_at, "2026-09-05T13:00:00.000Z");
  assert.equal(rows[0].title, "Prayer");
  assert.equal(rows[0].category, "Faith/Family");
  assert.equal(rows[0].source, "template");
  assert.equal(rows[1].start_at, "2026-09-05T22:00:00.000Z");
});

test("currentAndNextBlock picks the block containing `now` and the first one after it", () => {
  const blocks = [
    { id: "a", start_at: "2026-09-05T12:30:00.000Z", end_at: "2026-09-05T13:00:00.000Z" },
    { id: "b", start_at: "2026-09-05T14:00:00.000Z", end_at: "2026-09-05T22:00:00.000Z" },
    { id: "c", start_at: "2026-09-05T22:00:00.000Z", end_at: "2026-09-06T00:00:00.000Z" },
  ];

  const midB = new Date("2026-09-05T15:00:00.000Z");
  assert.deepEqual(currentAndNextBlock(blocks, midB), { current: blocks[1], next: blocks[2] });
});

test("currentAndNextBlock returns null current before the first block, null next after the last", () => {
  const blocks = [
    { id: "a", start_at: "2026-09-05T12:30:00.000Z", end_at: "2026-09-05T13:00:00.000Z" },
  ];

  const before = new Date("2026-09-05T10:00:00.000Z");
  assert.deepEqual(currentAndNextBlock(blocks, before), { current: null, next: blocks[0] });

  const after = new Date("2026-09-05T23:00:00.000Z");
  assert.deepEqual(currentAndNextBlock(blocks, after), { current: null, next: null });
});
