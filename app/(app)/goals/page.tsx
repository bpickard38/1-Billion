import PageTitle from "@/components/PageTitle";
import GoalTree from "@/components/goals/GoalTree";
import { createClient } from "@/lib/supabase/server";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("goals")
    .select("id, level, parent_id, title, target_value, target_unit, starts_on, ends_on, status")
    .order("level")
    .order("sort");

  return (
    <>
      <PageTitle>Goals</PageTitle>
      <GoalTree goals={goals ?? []} />
    </>
  );
}
