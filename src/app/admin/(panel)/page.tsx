import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [items, monsters, maps, drops, placeholderItems] = await Promise.all([
    prisma.item.count(),
    prisma.monster.count(),
    prisma.gameMap.count(),
    prisma.drop.count(),
    prisma.item.count({ where: { isPlaceholder: true } }),
  ]);

  const cards = [
    { href: "/admin/items", label: "Equipamiento", count: items },
    { href: "/admin/monsters", label: "Monstruos", count: monsters },
    { href: "/admin/maps", label: "Mapas", count: maps },
    { href: "/admin/drops", label: "Drops", count: drops },
  ];

  return (
    <div>
      <p className="text-sm text-muted">
        {placeholderItems > 0
          ? `Hay ${placeholderItems} ítem(s) todavía marcados como dato de ejemplo (placeholder). Al crear/editar desde acá se desmarcan automáticamente.`
          : "Todos los ítems fueron editados o creados manualmente."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-border bg-surface p-5 hover:border-accent/60 hover:bg-surface-hover"
          >
            <span className="text-2xl font-bold text-accent">{card.count}</span>
            <p className="mt-1 text-sm text-muted">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-border p-5">
        <h2 className="font-semibold text-foreground">¿Tienes muchos datos para cargar?</h2>
        <p className="mt-1 text-sm text-muted">
          Usa{" "}
          <Link href="/admin/import" className="text-accent hover:underline">
            importación masiva por CSV o JSON
          </Link>{" "}
          en vez de cargar uno por uno.
        </p>
      </div>
    </div>
  );
}
