import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SystemForm from "@/components/systems/SystemForm";
import { AREA_INFO, isArea } from "@/lib/areas";

// /systems/new?area=content opens a task for that tab.
export default async function NewSystemPage({ searchParams }: PageProps<"/systems/new">) {
  const { area: areaParam } = await searchParams;
  const area = isArea(areaParam) ? areaParam : null;
  const back = area ? { href: `/${area}`, label: AREA_INFO[area].label } : { href: "/systems", label: "Systems" };

  return (
    <>
      <div className="py-3">
        <Link href={back.href} className="-ml-1 flex items-center gap-0.5 text-sm text-accent">
          <ChevronLeft size={18} />
          {back.label}
        </Link>
      </div>
      <h1 className="pb-4 text-2xl font-bold tracking-tight">New</h1>
      <SystemForm area={area} initialKind={area ? "task" : "routine"} />
    </>
  );
}
