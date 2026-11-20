import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import SystemRunner from "@/components/systems/SystemRunner";
import { createClient } from "@/lib/supabase/server";
import { loadSystems, rateFor } from "@/lib/systems-data";
import { formatDays, TIME_LABELS } from "@/lib/systems";
import { AREA_INFO } from "@/lib/areas";

export default async function SystemPage({ params }: PageProps<"/systems/[slug]">) {
  const { slug } = await params;
  const { today, systems } = await loadSystems(slug);
  const system = systems[0];
  if (!system) notFound();

  const supabase = await createClient();
  const [{ data: steps }, { data: stepLogs }] = await Promise.all([
    supabase.from("system_steps").select("id, title").eq("system_id", system.id).order("sort"),
    supabase.from("step_logs").select("step_id").eq("system_id", system.id).eq("date", today),
  ]);
  const rate = rateFor(system, today);

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <Link href="/systems" className="-ml-1 flex items-center gap-0.5 text-sm text-accent">
          <ChevronLeft size={18} />
          Systems
        </Link>
        <Link href={`/systems/${slug}/edit`} className="text-sm text-accent">
          Edit
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">{system.name}</h1>
      <p className="pb-4 text-sm text-muted">
        {formatDays(system.daysOfWeek)} · {TIME_LABELS[system.timeOfDay ?? "anytime"]}
        {system.minutes && ` · ${system.minutes} min`}
        {system.area && ` · ${AREA_INFO[system.area].label}`}
        {!system.scheduledToday && " · not scheduled today"}
      </p>
      {system.details && <p className="-mt-1 whitespace-pre-wrap pb-5">{system.details}</p>}

      <SystemRunner
        systemId={system.id}
        steps={steps ?? []}
        initialTicked={(stepLogs ?? []).map((l) => l.step_id)}
        initialDone={system.doneToday}
      />

      <section className="mt-8 flex flex-col gap-3 pb-8">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface px-4 py-3">
            <p className="text-2xl font-bold">{system.streak}</p>
            <p className="text-xs text-muted">day streak</p>
          </div>
          <div className="rounded-xl bg-surface px-4 py-3">
            <p className="text-2xl font-bold">{rate ? `${rate.pct}%` : "–"}</p>
            <p className="text-xs text-muted">
              {rate ? `${rate.done} of ${rate.scheduled} days, last 30` : "last 30 days"}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
