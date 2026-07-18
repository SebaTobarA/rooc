import Link from "next/link";
import { Sword, Gem, Skull, Map as MapIcon, Users, CalendarDays, ClipboardList, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";
import { getSidebarSession } from "@/lib/sidebar-session";
import { getSession } from "@/lib/auth";
import { getActiveBuildsForSession } from "@/lib/skill-tree";

// Los contadores deben reflejar siempre el estado actual de la base, así
// que evitamos el prerenderizado estático de esta página.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [sidebarSession, itemCount, cardCount, monsterCount, mapCount, dropCount, session] = await Promise.all([
    getSidebarSession(),
    prisma.item.count(),
    prisma.card.count(),
    prisma.monster.count(),
    prisma.gameMap.count(),
    prisma.drop.count(),
    getSession(),
  ]);

  const { className, builds: activeBuilds } = await getActiveBuildsForSession(session);

  const pillars = [
    {
      href: "/panel/items",
      title: "Ítems y equipamiento",
      description: "Armas, armaduras y accesorios con stats, nivel requerido y rareza.",
      count: itemCount,
      unit: "ítems",
      icon: Sword,
    },
    {
      href: "/panel/cards",
      title: "Cartas",
      description: "Cartas equipables por slot, con bonos de colección, despertar y refine.",
      count: cardCount,
      unit: "cartas",
      icon: Gem,
    },
    {
      href: "/panel/monsters",
      title: "Bestiario",
      description: "Estadísticas de combate, elemento, raza y dónde encontrarlos.",
      count: monsterCount,
      unit: "monstruos",
      icon: Skull,
    },
    {
      href: "/panel/maps",
      title: "Mapas",
      description: "Regiones, monstruos que aparecen y NPCs relevantes.",
      count: mapCount,
      unit: "mapas",
      icon: MapIcon,
    },
  ];

  const guildCards = [
    sidebarSession?.canViewParty && {
      href: "/panel/party",
      title: "Party Builder",
      description: "Arma las parties de Guild League y Emperium Overrun a partir de las inscripciones.",
      icon: Users,
    },
    sidebarSession?.canManageParty && {
      href: "/panel/eventos",
      title: "Eventos",
      description: "Publica eventos con roster y botones de asistencia directo en Discord.",
      icon: CalendarDays,
    },
    (sidebarSession?.canManageRecruitment || sidebarSession?.isAdmin) && {
      href: "/admin/recruitment",
      title: "Reclutamiento",
      description: "Revisa las postulaciones de ingreso a la guild y decide quién entra.",
      icon: ClipboardList,
    },
  ].filter((card): card is { href: string; title: string; description: string; icon: typeof Users } =>
    Boolean(card)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      {/* ============ BIENVENIDA ============ */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--secondary), transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="relative flex flex-wrap items-center gap-4">
          {sidebarSession?.avatarUrl ? (
            <img
              src={sidebarSession.avatarUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border-2 border-accent/50"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-accent/50 bg-background-elevated text-lg font-bold text-accent">
              {(sidebarSession?.label ?? siteConfig.name).slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {sidebarSession ? "Bienvenido de nuevo" : siteConfig.tagline}
            </p>
            <h1 className="heading-gradient text-2xl font-extrabold sm:text-4xl">
              {sidebarSession?.label ?? siteConfig.name}
            </h1>
          </div>
          {sidebarSession?.job && (
            <span className="ml-auto rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              {sidebarSession.job}
            </span>
          )}
        </div>

        <p className="relative mt-5 max-w-2xl text-sm text-muted sm:text-base">
          {siteConfig.description}
        </p>

        <div className="relative mt-6 flex flex-wrap gap-3">
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
      </section>

      {/* ============ BASE DE DATOS ============ */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Base de datos
          </h2>
          <span className="text-xs text-muted">
            {dropCount} relaciones de drop cargadas
          </span>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Link
                key={pillar.href}
                href={pillar.href}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/10"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <span className="text-2xl font-bold text-accent">{pillar.count}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-accent">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{pillar.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ ADMINISTRACIÓN DE LA GUILD ============ */}
      {guildCards.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Administración de la guild
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guildCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-secondary/60 hover:bg-surface-hover hover:shadow-lg hover:shadow-secondary/10"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-secondary">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{card.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ SKILLS ============ */}
      {activeBuilds.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Skills</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeBuilds.map((build) => (
              <Link
                key={build.id}
                href={`/panel/build-pvp?build=${build.id}`}
                className="group flex items-start gap-3 rounded-xl border border-accent/30 bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Sparkles className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-accent">{className}</p>
                  <h3 className="font-semibold text-foreground group-hover:text-accent">{build.name}</h3>
                  <p className="mt-1 text-sm text-muted">Build de PVP enviada por la guild — click para verla.</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
