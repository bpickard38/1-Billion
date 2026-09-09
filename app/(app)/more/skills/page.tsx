import PageTitle from "@/components/PageTitle";
import CategoryList from "@/components/skills/CategoryList";
import { createClient } from "@/lib/supabase/server";
import type { SkillStatus } from "./actions";

export default async function SkillsPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: skills }] = await Promise.all([
    supabase.from("skill_categories").select("id, name, sort, is_side_tree").order("sort"),
    supabase.from("skills").select("id, category_id, name, sort, status").order("sort"),
  ]);

  return (
    <>
      <PageTitle>Skills</PageTitle>
      <CategoryList
        categories={categories ?? []}
        skills={(skills ?? []).map((s) => ({ ...s, status: s.status as SkillStatus }))}
      />
    </>
  );
}
