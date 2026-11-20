import "server-only";
import { z } from "zod";
import { respond } from "@/lib/openai";
import { UNITS, workoutPlanSchema, type Progression, type Unit, type WorkoutPlan } from "@/lib/workout";

const PLAN_INSTRUCTIONS = `You are an experienced calisthenics, running and mobility coach. Build a simple weekly training plan from the user's goals, weekly schedule and notes.
Rules:
- Return exactly 7 days, day 1 = Monday ... 7 = Sunday, in order.
- Follow the user's schedule (which days are strength, running, stretching, rest). If they say stretching every day, every day includes stretches.
- Keep it simple: no warm-up, 3-7 exercises per day, one flat list in the order to do them.
- Use real progressions toward skill goals (handstand push-up: pike push-ups, elevated pike push-ups, wall handstand holds, wall HSPU negatives; planche: planche leans, pseudo planche push-ups, tuck planche holds; splits: couch stretch, pancake, half splits, front split holds). Pick levels that suit their notes; if no level is given, assume an intermediate beginner and say so in the summary.
- Every exercise has: name (short, searchable on YouTube, e.g. "Tuck planche hold"), sets (1-6), a target range low-high, and unit: "reps" for repetitions, "seconds" for holds and stretches, "minutes" for runs (runs are 1 set). note is a few words like "each side" or "easy pace", or empty.
- minutes is the realistic total time for the day.
- summary: 1-3 sentences on how the week is built. tips: up to 5 short tips.
- If a current plan and a change request are given, return the full updated plan with only that change applied.
- Plain text only, no markdown.`;

const EXERCISE_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["name", "sets", "low", "high", "unit", "note"],
  properties: {
    name: { type: "string" },
    sets: { type: "integer" },
    low: { type: "integer" },
    high: { type: "integer" },
    unit: { type: "string", enum: [...UNITS] },
    note: { type: "string" },
  },
};

const PLAN_JSON = {
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
        required: ["day", "title", "minutes", "exercises"],
        properties: {
          day: { type: "integer" },
          title: { type: "string" },
          minutes: { type: "integer" },
          exercises: { type: "array", items: EXERCISE_JSON },
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
    instructions: PLAN_INSTRUCTIONS,
    input: JSON.stringify({
      goals: input.goals,
      weekly_schedule: input.schedule,
      notes: input.notes,
      ...(input.current && input.change ? { current_plan: input.current, change_request: input.change } : {}),
    }),
    schema: { name: "workout_plan", schema: PLAN_JSON },
    maxOutputTokens: 8000,
    timeoutMs: 110000,
  });
  try {
    const plan = workoutPlanSchema.parse(JSON.parse(raw));
    return { ...plan, days: [...plan.days].sort((a, b) => a.day - b.day) };
  } catch {
    throw new Error("The AI gave back a plan that didn't fit. Try again.");
  }
}

const PROGRESS_INSTRUCTIONS = `You are a calisthenics and running coach applying progressive overload after a workout.
You get today's exercises with their target (sets, low-high range, unit), what the user actually did per set (null = skipped), and recent past sessions of the same exercises.
For each exercise that was done today, decide the target for next time:
- Hit the top of the range on every set: raise the range (reps +1-2, holds +3-5 seconds, runs +2-5 minutes), or add a set.
- If the range is already high (about 12+ reps, 30+ seconds for a skill hold) and they hit it easily, switch to the next harder variation in newName with a lower range.
- Inside the range: keep it the same.
- Clearly below the bottom on most sets: keep it, or lower it slightly.
Keep newName "" unless switching variation. name must be exactly today's exercise name.
note: 1-3 short sentences telling the user what changed and why. Plain text.`;

const progressSchema = z.object({
  note: z.string().max(600),
  updates: z
    .array(
      z.object({
        name: z.string().max(120),
        sets: z.number().int(),
        low: z.number().int(),
        high: z.number().int(),
        newName: z.string().max(120),
      })
    )
    .max(15),
});

export async function progressWorkout(input: {
  today: { name: string; sets: number; low: number; high: number; unit: Unit; done: (number | null)[] }[];
  history: { date: string; name: string; unit: string; done: unknown }[];
}): Promise<{ note: string; updates: Progression[] }> {
  const raw = await respond({
    instructions: PROGRESS_INSTRUCTIONS,
    input: JSON.stringify(input),
    schema: {
      name: "progression",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["note", "updates"],
        properties: {
          note: { type: "string" },
          updates: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "sets", "low", "high", "newName"],
              properties: {
                name: { type: "string" },
                sets: { type: "integer" },
                low: { type: "integer" },
                high: { type: "integer" },
                newName: { type: "string" },
              },
            },
          },
        },
      },
    },
    maxOutputTokens: 2000,
    timeoutMs: 60000,
  });
  try {
    return progressSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error("The AI's update didn't fit. Your sets are saved; try Finish again.");
  }
}
