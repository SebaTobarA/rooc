"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/items", label: "Equipamiento" },
  { href: "/admin/cards", label: "Cartas" },
  { href: "/admin/sets", label: "Sets" },
  { href: "/admin/monsters", label: "Monstruos" },
  { href: "/admin/maps", label: "Mapas" },
  { href: "/admin/drops", label: "Drops" },
  { href: "/admin/import", label: "Importar CSV/JSON" },
  { href: "/admin/leadership", label: "Liderazgo" },
  { href: "/admin/members", label: "Miembros" },
  { href: "/admin/roles", label: "Roles y permisos" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-4">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
