import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import PlanningPanel from "@/components/schedule/PlanningPanel";
import { getPlanningData } from "./actions";

export const maxDuration = 60;
export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = (await searchParams).days === "7" ? 7 : 1;
  const result = await getPlanningData(days);
  return <><PageTitle>{days === 7 ? "Plan the next 7 days" : "Plan my day"}</PageTitle>{result.data ? <PlanningPanel key={days} initial={result.data} days={days} /> : <div role="alert" className="rounded-xl border border-border p-4"><p>{result.error}</p><Link href="/more/canvas" className="mt-3 block text-accent">Canvas settings →</Link></div>}</>;
}
