import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./csv.ts";

const columns = [
  { key: "name" as const, header: "Name" },
  { key: "notes" as const, header: "Notes" },
];

test("toCsv writes a header row plus one row per record", () => {
  const csv = toCsv(
    [
      { name: "Ada", notes: "founder" },
      { name: "Bob", notes: "vendor" },
    ],
    columns
  );
  assert.equal(csv, "Name,Notes\r\nAda,founder\r\nBob,vendor");
});

test("toCsv quotes and escapes cells containing commas, quotes, or newlines", () => {
  const csv = toCsv([{ name: 'Ada "The Ax" Smith', notes: "line1,line2\nline3" }], columns);
  assert.equal(csv, 'Name,Notes\r\n"Ada ""The Ax"" Smith","line1,line2\nline3"');
});

test("toCsv renders null/undefined as an empty cell and joins arrays with semicolons", () => {
  const csv = toCsv([{ name: null, notes: ["a", "b"] }], columns);
  assert.equal(csv, "Name,Notes\r\n,a; b");
});

test("toCsv returns just the header line for an empty row set", () => {
  assert.equal(toCsv([], columns), "Name,Notes");
});
