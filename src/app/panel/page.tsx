import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";

// Los contadores deben reflejar siempre el estado actual de la base, así
// que evitamos el prerenderizado estático de esta página.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [itemCount, cardCount, monsterCount, mapCount, dropCount] = await Promise.all([
    prisma.item.count(),
    prisma.card.count(),
    prisma.monster.count(),
    prisma.gameMap.count(),
    prisma.drop.count(),
  ]);

  const pillars = [
    {
      href: "/panel/items",
      title: "Ítems y equipamiento",
      description: "Armas, armaduras y accesorios con stats, nivel requerido y rareza.",
      count: itemCount,
      unit: "ítems",
    },
    {
      href: "/panel/cards",
      title: "Cartas",
      description: "Cartas equipables por slot, con bonos de colección, despertar y refine.",
      count: cardCount,
      unit: "cartas",
    },
    {
      href: "/panel/monsters",
      title: "Bestiario",
      description: "Estadísticas de combate, elemento, raza y dónde encontrarlos.",
      count: monsterCount,
      unit: "monstruos",
    },
    {
      href: "/panel/maps",
      title: "Mapas",
      description: "Regiones, monstruos que aparecen y NPCs relevantes.",
      count: mapCount,
      unit: "mapas",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <section className="rounded-2xl border border-border bg-surface p-8 sm:p-12">
        <h1 className="heading-gradient text-3xl font-extrabold sm:text-4xl">
          {siteConfig.name}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">{siteConfig.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/panel/items" className="btn-brand px-4 py-2 text-sm">
            Explorar ítems
          </Link>
          <Link
            href="/panel/cards"
            className="rounded-[10px] border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-surface-hover"
          >
            Explorar cartas
          </Link>
          <Link
            href="/panel/monsters"
            className="rounded-[10px] border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-surface-hover"
          >
            Ver bestiario
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted">
          {dropCount} relaciones de drop cargadas · datos de ejemplo (placeholder)
          incluidos para poder navegar el sitio de punta a punta.
        </p>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {pillars.map((pillar) => (
          <Link
            key={pillar.href}
            href={pillar.href}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/10"
          >
            <span className="text-2xl font-bold text-accent">{pillar.count}</span>
            <span className="text-xs uppercase tracking-wide text-muted">
              {pillar.unit}
            </span>
            <h2 className="mt-1 font-semibold text-foreground">{pillar.title}</h2>
            <p className="text-sm text-muted">{pillar.description}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10 rounded-xl border border-dashed border-border p-5">
        <h2 className="font-semibold text-foreground">Próximamente</h2>
        <p className="mt-1 text-sm text-muted">
          Medallas, monturas, pets y simuladores de clase — la arquitectura ya
          está pensada para sumarlos como secciones nuevas sin rehacer lo
          existente.
        </p>
      </section>
    </div>
  );
}
