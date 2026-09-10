import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import CanvasSettings from "@/components/more/CanvasSettings";
import { getCanvasSettings } from "./actions";

export const maxDuration = 60;

export default async function CanvasPage() {
  const result = await getCanvasSettings();
  return <><PageTitle>Canvas assignments</PageTitle><p className="mb-4 text-sm text-muted">Read assignments from BYU Canvas and plan time to work on them.</p><CanvasSettings initial={result.data ?? null} initialError={result.error ?? null} /><Link href="/schedule/plan" className="mt-6 block text-accent">Open daily and weekly planner →</Link></>;
}
