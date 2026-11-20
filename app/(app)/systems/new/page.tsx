import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SystemForm from "@/components/systems/SystemForm";

export default function NewSystemPage() {
  return (
    <>
      <div className="py-3">
        <Link href="/systems" className="-ml-1 flex items-center gap-0.5 text-sm text-accent">
          <ChevronLeft size={18} />
          Systems
        </Link>
      </div>
      <h1 className="pb-4 text-2xl font-bold tracking-tight">New system</h1>
      <SystemForm />
    </>
  );
}
