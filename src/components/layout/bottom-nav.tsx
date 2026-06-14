"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  DollarSign,
  MessageSquare,
} from "lucide-react";

// The 5 most-used sections become primary iOS tab bar items.
// Everything else remains accessible via the sidebar (hamburger).
const tabs = [
  { href: "/dashboard",   label: "Início",       icon: LayoutDashboard },
  { href: "/moradores",   label: "Moradores",    icon: Users },
  { href: "/ocorrencias", label: "Ocorrências",  icon: AlertTriangle },
  { href: "/financeiro",  label: "Financeiro",   icon: DollarSign },
  { href: "/chat",        label: "Chat",         icon: MessageSquare },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    // Only visible on mobile (hidden on lg+, where the sidebar takes over)
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 lg:hidden",
        "bg-card border-t border-border",
        // Respect the iOS home-indicator safe area
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="flex items-stretch h-14">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-blue-600 dark:text-blue-300" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[22px] w-[22px] transition-transform",
                  active && "scale-110"
                )}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  active ? "text-blue-600 dark:text-blue-300" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
