import "server-only";
import { z } from "zod";
import { respond } from "@/lib/openai";
import type { Area, PlannedTask } from "@/lib/areas";

const COMMON = `Turn the user's goals into a simple weekly plan of recurring tasks.
Each task: name (short, 1-5 words, unique), minutes (time it takes, or 0 if not timed), days (ISO weekdays it repeats on, 1 = Monday ... 7 = Sunday), timeOfDay ("morning", "afternoon", "evening" or "anytime"), details (one or two plain sentences on exactly what to do this week).
Respect any days, times and amounts the user gives. Keep it realistic: 2-8 tasks, no filler. summary: 1-2 sentences on how the week is built. Plain text, no markdown.`;

const AREA_INSTRUCTIONS: Record<Area, string> = {
  content: `You are a content strategist for a solo creator. ${COMMON}
Split production into steps on different days so each day has one clear job, e.g. Ideas & hooks, Write scripts, Film, Edit, Post & reply to comments. Match the number of posts per week they ask for.`,
  code: `You are a coding mentor for someone learning to code and building a game. ${COMMON}
Pair learning with building: a learning task (what to study, e.g. a specific concept or tutorial topic) and a build task that applies it to their game. Make the details concrete for this week (a specific concept and a specific small feature to build).`,
};

const taskSchema = z.object({
  name: z.string().trim().min(1).max(80),
  minutes: z.number().int().min(0).max(600),
  days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "anytime"]),
  details: z.string().max(1000),
});
const planSchema = z.object({ summary: z.string().max(1000), tasks: z.array(taskSchema).min(1).max(12) });

export async function planArea(area: Area, goals: string): Promise<{ summary: string; tasks: PlannedTask[] }> {
  const raw = await respond({
    instructions: AREA_INSTRUCTIONS[area],
    input: goals,
    schema: {
      name: "weekly_tasks",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "tasks"],
        properties: {
          summary: { type: "string" },
          tasks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "minutes", "days", "timeOfDay", "details"],
              properties: {
                name: { type: "string" },
                minutes: { type: "integer" },
                days: { type: "array", items: { type: "integer" } },
                timeOfDay: { type: "string", enum: ["morning", "afternoon", "evening", "anytime"] },
                details: { type: "string" },
              },
            },
          },
        },
      },
    },
    maxOutputTokens: 3000,
    timeoutMs: 90000,
  });
  let parsed: z.infer<typeof planSchema>;
  try {
    parsed = planSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error("The AI gave back a plan that didn't fit. Try again.");
  }
  return {
    summary: parsed.summary,
    tasks: parsed.tasks.map((t) => ({
      name: t.name,
      minutes: t.minutes > 0 ? t.minutes : null,
      days: [...new Set(t.days)].sort((a, b) => a - b),
      timeOfDay: t.timeOfDay === "anytime" ? null : t.timeOfDay,
      details: t.details.trim(),
    })),
  };
}
