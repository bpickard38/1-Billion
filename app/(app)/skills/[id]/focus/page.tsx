import { notFound } from "next/navigation";
import FocusTimer from "@/components/skills/FocusTimer";
import { createClient } from "@/lib/supabase/server";

export default async function SkillFocusPage({ params }: PageProps<"/skills/[id]/focus">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: skill } = await supabase.from("skills").select("id, name").eq("id", id).maybeSingle();
  if (!skill) notFound();

  return <FocusTimer skillName={skill.name} />;
}
