import { addDays, parseISO, format } from "date-fns";
import PageTitle from "@/components/PageTitle";
import ReviewForm from "@/components/week/ReviewForm";
import { createClient } from "@/lib/supabase/server";
import { getWeekStartDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import type { ReviewAnswers } from "../actions";

const EMPTY_ANSWERS: ReviewAnswers = {
  accomplished: "",
  failed: "",
  why: "",
  customerInsight: "",
  wastedTimeOn: "",
  bottleneck: "",
  nextWeekTop3: "",
};

export default async function WeekReviewPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("timezone").maybeSingle();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const weekStart = getWeekStartDateString(new Date(), timeZone);

  const { data: review } = await supabase
    .from("weekly_reviews")
    .select("answers, score, biggest_issue, closed_at, auto_closed")
    .eq("week_start", weekStart)
    .maybeSingle();

  const rangeLabel = `${format(parseISO(weekStart), "MMM d")}–${format(addDays(parseISO(weekStart), 6), "MMM d")}`;

  if (review?.closed_at) {
    const answers = (review.answers as unknown as ReviewAnswers) ?? EMPTY_ANSWERS;
    return (
      <>
        <PageTitle>{rangeLabel} — closed</PageTitle>
        <p className="mb-4 text-sm text-muted">
          Score {review.score}%{review.auto_closed ? " (auto-closed)" : ""}
          {review.biggest_issue && ` — biggest issue: ${review.biggest_issue}`}
        </p>
        <dl className="flex flex-col gap-3">
          {Object.entries(answers).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs uppercase tracking-wide text-muted">{key}</dt>
              <dd className="whitespace-pre-wrap text-sm">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </>
    );
  }

  const answers = (review?.answers as unknown as ReviewAnswers) ?? EMPTY_ANSWERS;

  return (
    <>
      <PageTitle>Weekly review — {rangeLabel}</PageTitle>
      <ReviewForm weekStart={weekStart} initialAnswers={{ ...EMPTY_ANSWERS, ...answers }} />
    </>
  );
}
