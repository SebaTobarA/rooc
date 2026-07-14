import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MonsterCard } from "@/components/monster-card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const map = await prisma.gameMap.findUnique({ where: { slug } });
  return { title: map?.name ?? "Mapa no encontrado" };
}

export default async function MapDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const map = await prisma.gameMap.findUnique({
    where: { slug },
    include: {
      npcs: { orderBy: { name: "asc" } },
      monsters: { include: { monster: true }, orderBy: { monster: { level: "asc" } } },
    },
  });

  if (!map) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/maps" className="text-sm text-muted hover:text-foreground">
        ← Volver a mapas
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{map.name}</h1>
          {map.isPlaceholder && (
            <span className="text-[10px] uppercase tracking-wide text-muted">
              Dato de ejemplo
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{map.region}</p>
        {map.description && <p className="mt-3 text-sm text-muted">{map.description}</p>}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Monstruos ({map.monsters.length})
        </h2>
        {map.monsters.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay monstruos asociados a este mapa.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {map.monsters.map(({ monster }) => (
              <MonsterCard key={monster.id} monster={monster} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          NPCs ({map.npcs.length})
        </h2>
        {map.npcs.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay NPCs cargados para este mapa.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {map.npcs.map((npc) => (
              <li key={npc.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-foreground">{npc.name}</span>
                {npc.role && <span className="text-muted">{npc.role}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
