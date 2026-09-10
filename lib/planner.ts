import { z } from "zod";
import { addDays, format, parseISO } from "date-fns";
import { localTimeToInstant } from "./dates.ts";

export const taskSchema = z.object({
  id: z.string().max(100), title: z.string().trim().min(1).max(250),
  minutes: z.number().int().min(5).max(1200),
  dueAt: z.string().datetime({ offset: true }).nullable(),
  assignmentId: z.string().uuid().nullable(),
});
export type PlanningTask = z.infer<typeof taskSchema>;
export type BusyBlock = { start_at: string; end_at: string; title: string };
export type ProposedBlock = { title: string; start_at: string; end_at: string; date: string; category: string; assignment_id: string | null };
export const preferencesSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  breakMinutes: z.number().int().min(0).max(60),
  sessionMinutes: z.number().int().min(15).max(120),
}).refine(p => p.end > p.start, "End time must be after start time.");
export type PlanningPreferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: PlanningPreferences = { start: "08:00", end: "20:00", breakMinutes: 10, sessionMinutes: 50 };

// The model estimates work; this deterministic allocator owns actual times.
export function proposeSchedule(tasks: PlanningTask[], busy: BusyBlock[], date: string, days: number, timeZone: string, prefs: PlanningPreferences, now = new Date()) {
  preferencesSchema.parse(prefs);
  const slots: { start: number; end: number; date: string }[] = [];
  for (let day = 0; day < days; day++) {
    const d = format(addDays(parseISO(date), day), "yyyy-MM-dd");
    let cursor = Math.max(localTimeToInstant(d, prefs.start, timeZone).getTime(), Math.ceil(now.getTime() / 300000) * 300000);
    const end = localTimeToInstant(d, prefs.end, timeZone).getTime();
    const events = busy.map(b => ({ start: Date.parse(b.start_at), end: Date.parse(b.end_at) })).filter(b => b.end > cursor && b.start < end).sort((a,b) => a.start-b.start);
    for (const event of events) {
      if (event.start > cursor) slots.push({ start: cursor, end: Math.min(event.start, end), date: d });
      cursor = Math.max(cursor, event.end);
    }
    if (cursor < end) slots.push({ start: cursor, end, date: d });
  }
  const blocks: ProposedBlock[] = [];
  const unplanned: { title: string; minutes: number; reason: string }[] = [];
  const freeMinutes = slots.reduce((sum,s) => sum + (s.end-s.start)/60000, 0);
  const ordered = [...tasks].sort((a,b) => (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity));
  for (const task of ordered) {
    let remaining = task.minutes;
    const deadline = task.dueAt ? Date.parse(task.dueAt) : Infinity;
    for (const slot of slots) {
      while (remaining > 0) {
        const available = Math.floor((Math.min(slot.end, deadline) - slot.start)/60000);
        const duration = Math.min(remaining, prefs.sessionMinutes, available);
        if (duration < Math.min(15, remaining)) break;
        const finish = slot.start + duration * 60000;
        blocks.push({ title: task.title, start_at: new Date(slot.start).toISOString(), end_at: new Date(finish).toISOString(), date: slot.date, category: task.assignmentId ? "School" : "Learning", assignment_id: task.assignmentId });
        remaining -= duration;
        slot.start = finish + prefs.breakMinutes * 60000;
      }
      if (!remaining) break;
    }
    if (remaining) unplanned.push({ title: task.title, minutes: remaining, reason: deadline <= now.getTime() ? "Already overdue; choose a new target date." : "Not enough available time before the deadline or end of this plan." });
  }
  return { blocks: blocks.sort((a,b) => a.start_at.localeCompare(b.start_at)), unplanned, freeMinutes };
}
