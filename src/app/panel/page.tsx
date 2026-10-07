import Link from "next/link";
import { Sword, Gem, Skull, Map as MapIcon, BellRing, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";
import { getSidebarSession } from "@/lib/sidebar-session";
import { getSession } from "@/lib/auth";
import { getActiveBuildsForSession, getJobChain } from "@/lib/skill-tree";
import { getPendingEventsForDiscordId } from "@/lib/events";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { BuildClassTabs } from "@/components/panel/build-class-tabs";
import { ProfileSection } from "@/components/panel/profile-section";
import { UpcomingRosters } from "@/components/panel/upcoming-rosters";

// Los contadores deben reflejar siempre el estado actual de la base, así
// que evitamos el prerenderizado estático de esta página.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inicio",
};

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

/**
 * Inicio del panel y perfil del jugador en una sola pantalla: arriba, en dos
 * bloques, quién es (con su clase) y los eventos que le falta responder;
 * después su ficha Core, el roster de los próximos eventos y la build de su
 * clase. La navegación al resto (base de datos, administración) vive en el
 * menú lateral, no acá.
 */
export default async function HomePage() {
  const [sidebarSession, itemCount, cardCount, monsterCount, mapCount, session] = await Promise.all([
    getSidebarSession(),
    prisma.item.count(),
    prisma.card.count(),
    prisma.monster.count(),
    prisma.gameMap.count(),
    getSession(),
  ]);

  const { className, builds: activeBuilds } = await getActiveBuildsForSession(session);
  // La build más reciente enviada para la clase del jugador — es la que se
  // muestra desglosada en la pestaña "Skills" de Build Class PVP.
  const primaryBuild = activeBuilds[0] ?? null;
  const primaryBuildChain = primaryBuild ? await getJobChain(primaryBuild.jobId) : null;

  const pendingEvents = sidebarSession?.canViewParty
    ? await getPendingEventsForDiscordId(session?.discordId)
    : [];

  const database = [
    { href: "/panel/items", title: "Ítems", count: itemCount, icon: Sword },
    { href: "/panel/cards", title: "Cartas", count: cardCount, icon: Gem },
    { href: "/panel/monsters", title: "Monstruos", count: monsterCount, icon: Skull },
    { href: "/panel/maps", title: "Mapas", count: mapCount, icon: MapIcon },
  ];

  // Bloque derecho del encabezado: recordatorio de eventos sin responder.
  const reminders = (
    <section
      className={`rounded-2xl border p-6 ${
        pendingEvents.length > 0 ? "border-accent/40 bg-accent/5" : "border-border bg-surface"
      }`}
    >
      {pendingEvents.length > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 shrink-0 text-accent" strokeWidth={2.2} />
            <h2 className="font-semibold text-foreground">
              Tienes {pendingEvents.length} evento{pendingEvents.length === 1 ? "" : "s"} sin responder
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Todavía no marcaste tu asistencia en Discord. Las inscripciones siguen abiertas.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {pendingEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {event.icon ? `${event.icon} ` : ""}
                    {event.title}
                  </p>
                  <p className="text-xs text-muted">
                    {EVENT_CATEGORY_LABEL[event.category]} — cierra el {EVENT_DATE_FORMATTER.format(event.signupsCloseAt)}
                  </p>
                </div>
                {event.discordUrl && (
                  <a
                    href={event.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-brand shrink-0 px-3 py-1.5 text-xs"
                  >
                    Responder en Discord
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-7 w-7 text-accent" strokeWidth={2} />
          <h2 className="font-semibold text-foreground">Estás al día con los eventos</h2>
          <p className="text-sm text-muted">No tienes encuestas de asistencia pendientes en Discord.</p>
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      {/* ============ PERFIL + FICHA CORE ============ */}
      {session?.discordId ? (
        <>
          <ProfileSection discordId={session.discordId} aside={reminders} />
          <UpcomingRosters discordId={session.discordId} />
        </>
      ) : (
        // Sesión de usuario/contraseña del admin: no hay cuenta de Discord
        // de la que mostrar un perfil.
        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h1 className="heading-gradient text-2xl font-extrabold sm:text-3xl">
            {sidebarSession?.label ?? siteConfig.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Inicia sesión con Discord para ver tu perfil de jugador y tu ficha.
          </p>
        </section>
      )}

      {/* ============ BUILD CLASS PVP ============ */}
      <div className="mt-8">
        <BuildClassTabs className={className} chain={primaryBuildChain} build={primaryBuild} />
      </div>

      {/* ============ BASE DE DATOS ============ */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Base de datos</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {database.map((entry) => {
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/60 hover:bg-surface-hover"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span>
                  <span className="block text-lg font-bold leading-tight text-foreground">{entry.count}</span>
                  <span className="block text-xs uppercase tracking-wide text-muted group-hover:text-accent">
                    {entry.title}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
