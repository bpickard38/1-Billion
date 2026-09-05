import { localTimeToInstant } from "./dates.ts";
import type { Tables, TablesInsert } from "./supabase/types";

type TemplateBlockInput = Pick<
  Tables<"schedule_templates">,
  "start_time" | "end_time" | "title" | "category"
>;

/** Converts a weekday's schedule_templates rows into today's schedule_blocks insert rows. */
export function materializeBlocks(
  templates: readonly TemplateBlockInput[],
  date: string,
  timeZone: string
): TablesInsert<"schedule_blocks">[] {
  return templates.map((t) => ({
    date,
    start_at: localTimeToInstant(date, t.start_time, timeZone).toISOString(),
    end_at: localTimeToInstant(date, t.end_time, timeZone).toISOString(),
    title: t.title,
    category: t.category,
    source: "template",
  }));
}

type ScheduleBlockLike = Pick<Tables<"schedule_blocks">, "id" | "start_at" | "end_at">;

/** The block `now` falls inside, and the next block starting after `now`. */
export function currentAndNextBlock<T extends ScheduleBlockLike>(
  blocks: readonly T[],
  now: Date
): { current: T | null; next: T | null } {
  const sorted = [...blocks].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const current =
    sorted.find((b) => new Date(b.start_at) <= now && now < new Date(b.end_at)) ?? null;
  const next = sorted.find((b) => new Date(b.start_at) > now) ?? null;
  return { current, next };
}
