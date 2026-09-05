import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import { createClient } from "@/lib/supabase/server";

export default async function ProblemsPage() {
  const supabase = await createClient();
  const { data: aggregates } = await supabase
    .from("problem_aggregates")
    .select("*");

  const sorted = [...(aggregates ?? [])].sort((a, b) => {
    const scoreA = (a.times_mentioned ?? 0) * (a.avg_pain_score ?? 0);
    const scoreB = (b.times_mentioned ?? 0) * (b.avg_pain_score ?? 0);
    return scoreB - scoreA;
  });

  return (
    <>
      <PageTitle>Problem database</PageTitle>
      <p className="mb-4 text-sm text-muted">Evidence, not intuition — sorted by mentions × avg pain.</p>

      {sorted.length === 0 && <p className="text-sm text-muted">No problems tagged yet.</p>}

      <ul className="flex flex-col gap-2">
        {sorted.map((p) => (
          <li key={p.problem_id}>
            <Link
              href={`/crm/problems/${p.problem_id}`}
              className="flex flex-col gap-1 rounded-lg border border-border p-3"
            >
              <span className="text-sm font-medium">{p.title}</span>
              <span className="text-xs text-muted">
                Mentioned {p.times_mentioned ?? 0} · avg pain {p.avg_pain_score?.toFixed(1) ?? "—"} ·{" "}
                {p.pilot_pct ?? 0}% would pilot
                {p.industries && p.industries.length > 0 ? ` · ${p.industries.join(", ")}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
