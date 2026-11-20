"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Code, Dumbbell, ListChecks, MessageCircle } from "lucide-react";

const tabs = [
  { href: "/systems", label: "Systems", Icon: ListChecks },
  { href: "/exercise", label: "Exercise", Icon: Dumbbell },
  { href: "/content", label: "Content", Icon: Clapperboard },
  { href: "/code", label: "Code", Icon: Code },
  { href: "/chat", label: "Chat", Icon: MessageCircle },
] as const;

/** Bottom tab bar. 3.5rem tall plus the iPhone safe area (the chat input sits on top of it). */
export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg/95 pb-safe backdrop-blur">
      <ul className="mx-auto flex h-14 max-w-lg">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] ${
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
