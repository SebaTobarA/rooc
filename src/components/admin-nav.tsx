"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * Encabezado de cada página de admin: la ruta de navegación (grupo › sección)
 * y el título con el ícono de la sección. La navegación vive solo en el menú
 * lateral (siteConfig.navGroups), y de ahí mismo salen el nombre y el ícono.
 */
export function AdminHeading() {
  const pathname = usePathname();

  // La entrada más específica que contenga la ruta actual (ej. "/admin/items"
  // le gana a "/admin" estando en /admin/items/123/edit).
  const match = siteConfig.navGroups
    .flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })))
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!match) return null;
  const Icon = match.icon;
  const isSubpage = pathname !== match.href;

  return (
    <header className="border-b border-border pb-5">
      <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <span>{match.group}</span>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        {isSubpage ? (
          <Link href={match.href} className="hover:text-accent">
            {match.label}
          </Link>
        ) : (
          <span className="text-foreground">{match.label}</span>
        )}
      </nav>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{match.label}</h1>
      </div>
    </header>
  );
}
