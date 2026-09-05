"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, CalendarClock, CalendarRange, Target, Users, MoreHorizontal } from "lucide-react";

const tabs = [
  { href: "/today", label: "Today", Icon: Sun },
  { href: "/schedule", label: "Schedule", Icon: CalendarClock },
  { href: "/week", label: "Week", Icon: CalendarRange },
  { href: "/goals", label: "Goals", Icon: Target },
  { href: "/crm", label: "CRM", Icon: Users },
  { href: "/more", label: "More", Icon: MoreHorizontal },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 backdrop-blur pb-safe">
      <ul className="flex">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
