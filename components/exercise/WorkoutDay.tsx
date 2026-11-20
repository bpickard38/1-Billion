import { PlayCircle } from "lucide-react";
import { formatTarget, tutorialLink, type WorkoutDayPlan } from "@/lib/workout";

/** One day's exercises, read-only (the week list). */
export default function WorkoutDay({ day }: { day: WorkoutDayPlan }) {
  if (day.exercises.length === 0) return <p className="text-sm text-muted">Rest day.</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {day.exercises.map((ex, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="block">{ex.name}</span>
            <span className="block text-sm text-muted">
              {formatTarget(ex)}
              {ex.note && ` · ${ex.note}`}
            </span>
          </span>
          <TutorialLink name={ex.name} />
        </li>
      ))}
    </ul>
  );
}

export function TutorialLink({ name }: { name: string }) {
  return (
    <a
      href={tutorialLink(name)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`How to do ${name} (YouTube)`}
      className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-accent active:bg-surface"
    >
      <PlayCircle size={16} />
      How to
    </a>
  );
}
