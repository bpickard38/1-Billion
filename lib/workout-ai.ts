import "server-only";
import { z } from "zod";
import { respond } from "@/lib/openai";

const exercise = z.object({ name: z.string().min(1).max(120), prescription: z.string().max(120) });
const section = z.object({ title: z.string().min(1).max(60), exercises: z.array(exercise).max(15) });
const day = z.object({
  day: z.number().int().min(1).max(7),
  title: z.string().min(1).max(80),
  minutes: z.number().int().min(0).max(300),
  sections: z.array(section).max(6),
});
export const workoutPlanSchema = z.object({
  summary: z.string().max(600),
  days: z.array(day).length(7),
  tips: z.array(z.string().max(300)).max(8),
});
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;

const INSTRUCTIONS = `You are an experienced calisthenics, running and mobility coach. Build a weekly training plan from the user's goals, weekly schedule and notes.
Rules:
- Return exactly 7 days, day 1 = Monday ... 7 = Sunday, in order.
- Follow the user's schedule (which days are strength, running, stretching, rest). If they say stretching every day, every day gets a stretching section.
- Use real progressions toward skill goals (for example handstand push-up: pike push-ups, elevated pike push-ups, wall handstand holds, wall HSPU negatives; planche: planche leans, pseudo planche push-ups, tuck planche holds; splits: couch stretch, pancake, half splits, front split holds). Pick levels that suit their notes; if no level is given, assume an intermediate beginner and say so in the summary.
- Each day has sections in order, such as "Warm-up", "Skill", "Strength", "Run", "Stretch". A rest day can be just a short stretch or walk.
- prescription is short: "4 x 6-8", "3 x 20 s hold", "25 min easy, conversational pace", "2 x 60 s each side".
- minutes is the realistic total time for the day.
- summary: 1-3 sentences on how the week is built. tips: up to 5 short progression or recovery tips.
- If a current plan and a change request are given, return the full updated plan with only that change applied.
- Plain text only, no markdown.`;

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "days", "tips"],
  properties: {
    summary: { type: "string" },
    tips: { type: "array", items: { type: "string" } },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day", "title", "minutes", "sections"],
        properties: {
          day: { type: "integer" },
          title: { type: "string" },
          minutes: { type: "integer" },
          sections: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "exercises"],
              properties: {
                title: { type: "string" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "prescription"],
                    properties: { name: { type: "string" }, prescription: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function planWorkouts(input: {
  goals: string;
  schedule: string;
  notes: string;
  current?: WorkoutPlan | null;
  change?: string;
}): Promise<WorkoutPlan> {
  const raw = await respond({
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      goals: input.goals,
      weekly_schedule: input.schedule,
      notes: input.notes,
      ...(input.current && input.change ? { current_plan: input.current, change_request: input.change } : {}),
    }),
    schema: { name: "workout_plan", schema: JSON_SCHEMA },
    maxOutputTokens: 10000,
    timeoutMs: 110000,
  });
  try {
    const plan = workoutPlanSchema.parse(JSON.parse(raw));
    return { ...plan, days: [...plan.days].sort((a, b) => a.day - b.day) };
  } catch {
    throw new Error("The AI gave back a plan that didn't fit. Try again.");
  }
}
