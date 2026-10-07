import Link from "next/link";
import { Sword, Gem, Skull, Map as MapIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Base de datos",
};

/** Portada de la base de datos del juego: la entrada del menú lateral lleva acá y de acá a cada sección. */
export default async function DatabasePage() {
  const [itemCount, cardCount, monsterCount, mapCount, dropCount] = await Promise.all([
    prisma.item.count(),
    prisma.card.count(),
    prisma.monster.count(),
    prisma.gameMap.count(),
    prisma.drop.count(),
  ]);

  const sections = [
    {
      href: "/panel/items",
      title: "Ítems y equipamiento",
      description: "Armas, armaduras y accesorios con stats, nivel requerido y rareza.",
      count: itemCount,
      icon: Sword,
    },
    {
      href: "/panel/cards",
      title: "Cartas",
      description: "Cartas equipables por slot, con bonos de colección, despertar y refine.",
      count: cardCount,
      icon: Gem,
    },
    {
      href: "/panel/monsters",
      title: "Bestiario",
      description: "Estadísticas de combate, elemento, raza y dónde encontrarlos.",
      count: monsterCount,
      icon: Skull,
    },
    {
      href: "/panel/maps",
      title: "Mapas",
      description: "Regiones, monstruos que aparecen y NPCs relevantes.",
      count: mapCount,
      icon: MapIcon,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="heading-gradient text-2xl font-extrabold sm:text-3xl">Base de datos</h1>
        <span className="text-xs text-muted">{dropCount} relaciones de drop cargadas</span>
      </div>
      <p className="mt-1 text-sm text-muted">Ítems, cartas, bestiario y mapas de Ragnarok Online Origin Classic.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group flex items-start gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/60 hover:bg-surface-hover"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-foreground group-hover:text-accent">{section.title}</span>
                  <span className="text-xl font-bold text-accent">{section.count}</span>
                </span>
                <span className="mt-1 block text-sm text-muted">{section.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
