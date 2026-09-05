import PageTitle from "@/components/PageTitle";
import CategoryList from "@/components/skills/CategoryList";
import { createClient } from "@/lib/supabase/server";

export default async function SkillsPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: skills }, { data: milestones }] = await Promise.all([
    supabase.from("skill_categories").select("id, name, sort, is_side_tree").order("sort"),
    supabase.from("skills").select("id, category_id, name, sort").order("sort"),
    supabase.from("skill_milestones").select("id, skill_id, done"),
  ]);

  return (
    <>
      <PageTitle>Skills</PageTitle>
      <CategoryList
        categories={categories ?? []}
        skills={skills ?? []}
        milestones={milestones ?? []}
      />
    </>
  );
}
