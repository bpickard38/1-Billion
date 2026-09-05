import { notFound } from "next/navigation";
import PageTitle from "@/components/PageTitle";
import MilestoneList from "@/components/skills/MilestoneList";
import ResourceList from "@/components/skills/ResourceList";
import { createClient } from "@/lib/supabase/server";

export default async function SkillDetailPage({ params }: PageProps<"/more/skills/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: skill } = await supabase
    .from("skills")
    .select("id, name, skill_categories(name)")
    .eq("id", id)
    .maybeSingle();

  if (!skill) notFound();

  const [{ data: milestones }, { data: resources }] = await Promise.all([
    supabase
      .from("skill_milestones")
      .select("id, title, done, done_at, proof")
      .eq("skill_id", id)
      .order("created_at"),
    supabase
      .from("skill_resources")
      .select("id, kind, title, url, how_to_use")
      .eq("skill_id", id)
      .order("created_at"),
  ]);

  const categoryName = (skill as { skill_categories?: { name: string } | null }).skill_categories?.name;

  return (
    <>
      <PageTitle>{skill.name}</PageTitle>
      {categoryName && <p className="-mt-3 mb-4 text-xs uppercase tracking-wide text-muted">{categoryName}</p>}

      <section className="mb-6 flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Milestones</h2>
        <MilestoneList skillId={id} milestones={milestones ?? []} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Resources</h2>
        <ResourceList skillId={id} resources={resources ?? []} />
      </section>
    </>
  );
}
