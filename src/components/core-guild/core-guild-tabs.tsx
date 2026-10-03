"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/core-guild", label: "Organización", exact: true },
  { href: "/admin/core-guild/censo", label: "Censo" },
];

/** Sub-navegación de /admin/core-guild: armado de parties/guilds y censo de miembros. */
export function CoreGuildTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              active
                ? "border-accent text-accent"
                : "border-border text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
