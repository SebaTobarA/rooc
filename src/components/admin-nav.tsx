"use client";

import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";

/**
 * Título de la sección de admin en la que se está. Reemplaza a la barra de
 * links que había arriba de cada página de /admin: la navegación ahora vive
 * solo en el menú lateral (siteConfig.navGroups), y de ahí mismo sale el
 * nombre de cada sección.
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

  return (
    <header className="border-b border-border pb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{match.group}</p>
      <h1 className="mt-1 text-xl font-bold text-foreground">{match.label}</h1>
    </header>
  );
}
