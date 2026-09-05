import PageTitle from "@/components/PageTitle";
import TemplateDay, { type TemplateBlock } from "@/components/schedule/TemplateDay";
import { createClient } from "@/lib/supabase/server";

const WEEKDAY_LABEL: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export default async function ScheduleTemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("schedule_templates")
    .select("id, weekday, start_time, end_time, title, category")
    .order("weekday")
    .order("start_time");

  const byWeekday = new Map<number, TemplateBlock[]>();
  for (let day = 1; day <= 7; day++) byWeekday.set(day, []);
  for (const block of templates ?? []) {
    byWeekday.get(block.weekday)?.push(block);
  }

  return (
    <>
      <PageTitle>Schedule templates</PageTitle>
      <div className="flex flex-col gap-4 pb-8">
        {Array.from(byWeekday.entries()).map(([weekday, blocks]) => (
          <TemplateDay key={weekday} weekday={weekday} label={WEEKDAY_LABEL[weekday]} blocks={blocks} />
        ))}
      </div>
    </>
  );
}
