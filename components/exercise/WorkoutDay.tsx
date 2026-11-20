import type { WorkoutPlan } from "@/lib/workout-ai";

/** One day's sections and exercises. */
export default function WorkoutDay({ day }: { day: WorkoutPlan["days"][number] }) {
  return (
    <div className="flex flex-col gap-4">
      {day.sections.map((section, i) => (
        <div key={i}>
          <h4 className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{section.title}</h4>
          <ul className="flex flex-col divide-y divide-border">
            {section.exercises.map((ex, j) => (
              <li key={j} className="flex items-baseline justify-between gap-3 py-2">
                <span>{ex.name}</span>
                <span className="shrink-0 text-right text-sm text-muted">{ex.prescription}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
