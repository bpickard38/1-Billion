import PageTitle from "@/components/PageTitle";
import { createClient } from "@/lib/supabase/server";

export default async function WeekPage() {
  const supabase = await createClient();
  const { data: weekGoals } = await supabase
    .from("goals")
    .select("id, title, status, target_value, target_unit")
    .eq("level", "week")
    .order("starts_on", { ascending: false });

  return (
    <>
      <PageTitle>Week</PageTitle>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Week goals</p>

      {(!weekGoals || weekGoals.length === 0) && (
        <p className="text-sm text-muted">No week goals yet — add one from Goals.</p>
      )}

      <ul className="flex flex-col gap-2">
        {weekGoals?.map((g) => (
          <li
            key={g.id}
            className={`rounded-lg border border-border px-3 py-2 text-sm ${
              g.status === "dropped" ? "text-muted line-through" : g.status === "done" ? "text-good" : ""
            }`}
          >
            {g.title}
            {g.target_value != null && (
              <span className="ml-2 text-xs text-muted">
                target: {g.target_value} {g.target_unit ?? ""}
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-muted">Read-only for now — the scorecard and review gate land in Phase 5.</p>
    </>
  );
}
