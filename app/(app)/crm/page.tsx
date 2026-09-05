import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import ContactList from "@/components/crm/ContactList";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";

export default async function CRMPage({ searchParams }: PageProps<"/crm">) {
  const { due } = await searchParams;
  const supabase = await createClient();

  const [{ data: profile }, { data: contacts }, { data: problems }] = await Promise.all([
    supabase.from("profiles").select("timezone").maybeSingle(),
    supabase.from("contacts").select("*").order("name"),
    supabase.from("problems").select("id, title").order("title"),
  ]);

  const today = getLocalDateString(new Date(), profile?.timezone ?? DEFAULT_TIMEZONE);

  return (
    <>
      <PageTitle>CRM</PageTitle>
      <Link href="/crm/problems" className="mb-4 inline-block text-sm text-accent">
        Problem database →
      </Link>
      <ContactList
        contacts={contacts ?? []}
        problems={problems ?? []}
        today={today}
        initialDueOnly={due === "1"}
      />
    </>
  );
}
