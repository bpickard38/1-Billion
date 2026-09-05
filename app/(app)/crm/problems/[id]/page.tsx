import { notFound } from "next/navigation";
import PageTitle from "@/components/PageTitle";
import ProblemForm from "@/components/crm/ProblemForm";
import { createClient } from "@/lib/supabase/server";

export default async function ProblemDetailPage({ params }: PageProps<"/crm/problems/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: problem } = await supabase.from("problems").select("*").eq("id", id).maybeSingle();

  if (!problem) notFound();

  return (
    <>
      <PageTitle>{problem.title}</PageTitle>
      <ProblemForm problem={problem} />
    </>
  );
}
