import test from "node:test";
import assert from "node:assert/strict";
import { proposeSchedule, defaultPreferences, type PlanningTask } from "./planner.ts";

const task = (minutes: number, dueAt: string | null = null): PlanningTask => ({ id:"task",title:"Essay",minutes,dueAt,assignmentId:null });
const now = new Date("2026-09-10T12:00:00Z");
test("splits work around commitments, respects local hours and leaves breaks", () => {
  const result = proposeSchedule([task(120)],[{ title:"Class",start_at:"2026-09-10T15:00:00Z",end_at:"2026-09-10T16:00:00Z" }],"2026-09-10",1,"America/Denver",{...defaultPreferences,end:"12:00"},now);
  assert.equal(result.blocks.reduce((sum,b) => sum+(Date.parse(b.end_at)-Date.parse(b.start_at))/60000,0),120);
  for (const b of result.blocks) assert.ok(Date.parse(b.end_at) <= Date.parse("2026-09-10T15:00:00Z") || Date.parse(b.start_at) >= Date.parse("2026-09-10T16:00:00Z"));
  assert.equal(result.blocks[0].start_at,"2026-09-10T14:00:00.000Z");
  assert.equal(result.blocks[1].start_at,"2026-09-10T16:00:00.000Z");
});
test("never invents time before a deadline, reports remaining effort", () => {
  const result = proposeSchedule([task(120,"2026-09-10T14:30:00Z")],[],"2026-09-10",1,"America/Denver",defaultPreferences,now);
  assert.equal(result.blocks.length,1); assert.equal(result.unplanned[0].minutes,90);
  assert.equal(result.blocks[0].end_at,"2026-09-10T14:30:00.000Z");
});
test("overdue tasks stay unplanned and overlapping/all-day events block time", () => {
  const result = proposeSchedule([task(60,"2026-09-09T14:30:00Z")],[],"2026-09-10",7,"America/Denver",defaultPreferences,now);
  assert.equal(result.blocks.length,0); assert.match(result.unplanned[0].reason,/overdue/);
  const blocked = proposeSchedule([task(60)],[{title:"Away",start_at:"2026-09-09T00:00:00Z",end_at:"2026-09-12T00:00:00Z"}],"2026-09-10",1,"America/Denver",defaultPreferences,now);
  assert.equal(blocked.blocks.length,0);
});
test("weekly planning handles daylight saving time by local calendar date", () => {
  const result = proposeSchedule([task(180)],[],"2026-10-31",3,"America/Denver",{start:"08:00",end:"09:00",breakMinutes:0,sessionMinutes:60},new Date("2026-10-31T00:00:00Z"));
  assert.deepEqual(result.blocks.map(b => b.start_at),["2026-10-31T14:00:00.000Z","2026-11-01T15:00:00.000Z","2026-11-02T15:00:00.000Z"]);
});
test("does not schedule in the past or exceed full capacity", () => {
  const result = proposeSchedule([task(120)],[],"2026-09-10",1,"America/Denver",{...defaultPreferences,end:"09:00"},new Date("2026-09-10T14:45:01Z"));
  assert.equal(result.blocks.length,0); assert.equal(result.unplanned[0].minutes,120);
});
