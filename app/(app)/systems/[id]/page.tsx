import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import DoneButton from "@/components/systems/DoneButton";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";

export default async function SystemPage({ params }: PageProps<"/systems/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile();
  const today = getLocalDateString(new Date(), profile?.timezone ?? DEFAULT_TIMEZONE);

  const [{ data: system }, { data: steps }, { data: log }] = await Promise.all([
    supabase.from("systems").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("system_steps").select("id, title").eq("system_id", id).order("sort"),
    supabase.from("system_logs").select("id").eq("system_id", id).eq("date", today).maybeSingle(),
  ]);
  if (!system) notFound();

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <Link href="/systems" className="-ml-1 flex items-center gap-0.5 text-sm text-accent">
          <ChevronLeft size={18} />
          Systems
        </Link>
        <Link href={`/systems/${id}/edit`} className="text-sm text-accent">
          Edit
        </Link>
      </div>

      <h1 className="pb-4 text-2xl font-bold tracking-tight">{system.name}</h1>

      <ol className="flex flex-col">
        {(steps ?? []).map((step, i) => (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                {i + 1}
              </span>
              {i < (steps?.length ?? 0) - 1 && <span className="w-px flex-1 bg-border" />}
            </div>
            <p className="pb-5 pt-0.5">{step.title}</p>
          </li>
        ))}
      </ol>

      <DoneButton systemId={id} initialDone={Boolean(log)} />
    </>
  );
}
