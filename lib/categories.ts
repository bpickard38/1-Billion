// schedule_blocks/schedule_templates.category values — must match the
// check constraint in supabase/migrations/0001_core.sql.
export const CATEGORIES = [
  "Faith/Family",
  "Health",
  "School",
  "Startup-Customers",
  "Startup-Build",
  "Startup-Strategy",
  "Learning",
  "Racing",
  "Rest",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Cosmetic reminder only (PLAN.md §3.3) — nothing enforced.
const PROTECTED_CATEGORIES: readonly Category[] = ["Faith/Family", "Rest"];

export function isProtectedCategory(category: string): boolean {
  return (PROTECTED_CATEGORIES as readonly string[]).includes(category);
}

export const CATEGORY_DOT_CLASS: Record<Category, string> = {
  "Faith/Family": "bg-violet-400",
  Health: "bg-emerald-400",
  School: "bg-sky-400",
  "Startup-Customers": "bg-amber-400",
  "Startup-Build": "bg-orange-400",
  "Startup-Strategy": "bg-rose-400",
  Learning: "bg-cyan-400",
  Racing: "bg-fuchsia-400",
  Rest: "bg-slate-400",
};

export function categoryDotClass(category: string): string {
  return (CATEGORY_DOT_CLASS as Record<string, string>)[category] ?? "bg-muted";
}

// Calendar-grid event card background + border (day view).
const CATEGORY_BLOCK_CLASS: Record<Category, string> = {
  "Faith/Family": "bg-violet-400/15 border-violet-400/50",
  Health: "bg-emerald-400/15 border-emerald-400/50",
  School: "bg-sky-400/15 border-sky-400/50",
  "Startup-Customers": "bg-amber-400/15 border-amber-400/50",
  "Startup-Build": "bg-orange-400/15 border-orange-400/50",
  "Startup-Strategy": "bg-rose-400/15 border-rose-400/50",
  Learning: "bg-cyan-400/15 border-cyan-400/50",
  Racing: "bg-fuchsia-400/15 border-fuchsia-400/50",
  Rest: "bg-slate-400/15 border-slate-400/50",
};

export function categoryBlockClass(category: string): string {
  return (CATEGORY_BLOCK_CLASS as Record<string, string>)[category] ?? "bg-muted/15 border-border";
}
