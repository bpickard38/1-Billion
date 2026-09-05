import PageTitle from "@/components/PageTitle";
import IdeasList from "@/components/ideas/IdeasList";
import { createClient } from "@/lib/supabase/server";

export default async function IdeasPage() {
  const supabase = await createClient();
  const { data: ideas } = await supabase
    .from("ideas")
    .select("id, title, why_interesting, research_later, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageTitle>Ideas</PageTitle>
      <IdeasList ideas={ideas ?? []} />
    </>
  );
}
