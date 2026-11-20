import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import SystemForm from "@/components/systems/SystemForm";
import { createClient } from "@/lib/supabase/server";
import { isTimeOfDay } from "@/lib/systems";

export default async function EditSystemPage({ params }: PageProps<"/systems/[slug]/edit">) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: system } = await supabase
    .from("systems")
    .select("id, name, days_of_week, time_of_day")
    .eq("slug", slug)
    .maybeSingle();
  if (!system) notFound();
  const { data: steps } = await supabase
    .from("system_steps")
    .select("id, title")
    .eq("system_id", system.id)
    .order("sort");

  return (
    <>
      <div className="py-3">
        <Link href={`/systems/${slug}`} className="-ml-1 flex items-center gap-0.5 text-sm text-accent">
          <ChevronLeft size={18} />
          {system.name}
        </Link>
      </div>
      <h1 className="pb-4 text-2xl font-bold tracking-tight">Edit system</h1>
      <SystemForm
        id={system.id}
        initialName={system.name}
        initialSteps={steps ?? []}
        initialDays={system.days_of_week}
        initialTimeOfDay={isTimeOfDay(system.time_of_day) ? system.time_of_day : null}
      />
    </>
  );
}
