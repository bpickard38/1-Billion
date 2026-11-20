import Link from "next/link";
import ReorderList from "@/components/systems/ReorderList";
import { loadSystems } from "@/lib/systems-data";

export default async function ReorderPage() {
  const { systems } = await loadSystems();

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <h1 className="text-2xl font-bold tracking-tight">Reorder</h1>
        <Link href="/systems" className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white">
          Done
        </Link>
      </div>
      <p className="pb-4 text-sm text-muted">Systems stay grouped by time of day. Move them up or down within a group.</p>
      <ReorderList systems={systems.map((s) => ({ id: s.id, name: s.name, timeOfDay: s.timeOfDay }))} />
    </>
  );
}
