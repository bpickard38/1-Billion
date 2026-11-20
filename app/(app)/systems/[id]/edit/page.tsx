import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import SystemForm from "@/components/systems/SystemForm";
import { createClient } from "@/lib/supabase/server";

export default async function EditSystemPage({ params }: PageProps<"/systems/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: system }, { data: steps }] = await Promise.all([
    supabase.from("systems").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("system_steps").select("title").eq("system_id", id).order("sort"),
  ]);
  if (!system) notFound();

  return (
    <>
      <div className="py-3">
        <Link href={`/systems/${id}`} className="-ml-1 flex items-center gap-0.5 text-sm text-accent">
          <ChevronLeft size={18} />
          {system.name}
        </Link>
      </div>
      <h1 className="pb-4 text-2xl font-bold tracking-tight">Edit system</h1>
      <SystemForm id={id} initialName={system.name} initialSteps={(steps ?? []).map((s) => s.title)} />
    </>
  );
}
