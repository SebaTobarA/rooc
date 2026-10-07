import Link from "next/link";
import { BellRing, CheckCircle2, ClipboardPen } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getSidebarSession } from "@/lib/sidebar-session";
import { getSession } from "@/lib/auth";
import { getActiveBuildsForSession, getJobChain } from "@/lib/skill-tree";
import { getPendingEventsForDiscordId } from "@/lib/events";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { getSheetUpdateReminder } from "@/lib/core-census/update-reminder";
import { BuildClassTabs } from "@/components/panel/build-class-tabs";
import { ProfileSection } from "@/components/panel/profile-section";
import { UpcomingRosters } from "@/components/panel/upcoming-rosters";

// Las notificaciones y el roster deben reflejar siempre el estado actual, así
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
 * Inicio del panel: un tablero con lo que el staff quiere que el jugador vea
 * al entrar. Arriba, en dos bloques, quién es (con su clase) y sus
 * notificaciones (eventos sin responder y el aviso de actualizar su ficha);
 * después el roster de los próximos eventos y la build de su clase. Su ficha
 * y su rendimiento viven en /panel/personaje.
 */
export default async function HomePage() {
  const [sidebarSession, session] = await Promise.all([getSidebarSession(), getSession()]);

  const { className, builds: activeBuilds } = await getActiveBuildsForSession(session);
  // La build más reciente enviada para la clase del jugador — es la que se
  // muestra desglosada en la pestaña "Skills" de Build Class PVP.
  const primaryBuild = activeBuilds[0] ?? null;
  const primaryBuildChain = primaryBuild ? await getJobChain(primaryBuild.jobId) : null;

  const [pendingEvents, sheetReminder] = await Promise.all([
    sidebarSession?.canViewParty ? getPendingEventsForDiscordId(session?.discordId) : Promise.resolve([]),
    session?.discordId ? getSheetUpdateReminder(session.discordId) : Promise.resolve(null),
  ]);
  const notificationCount = pendingEvents.length + (sheetReminder ? 1 : 0);

  // Bloque derecho del encabezado: las notificaciones del jugador.
  const notifications = (
    <section
      className={`rounded-2xl border p-6 ${
        notificationCount > 0 ? "border-accent/40 bg-accent/5" : "border-border bg-surface"
      }`}
    >
      {notificationCount > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 shrink-0 text-accent" strokeWidth={2.2} />
            <h2 className="font-semibold text-foreground">
              Tienes {notificationCount} pendiente{notificationCount === 1 ? "" : "s"}
            </h2>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {sheetReminder && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                <div className="flex min-w-0 items-start gap-2">
                  <ClipboardPen className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" strokeWidth={2.2} />
                  <div>
                    <p className="font-medium text-foreground">Actualizar mi ficha</p>
                    <p className="text-xs text-muted">
                      {sheetReminder.kind === "never"
                        ? "Tu ficha Core todavía no tiene datos validados."
                        : `Tu última validación fue hace ${sheetReminder.daysSince} días.`}{" "}
                      El staff pide actualizarla cada {sheetReminder.intervalDays} días.
                    </p>
                  </div>
                </div>
                <Link href="/panel/ficha" className="btn-brand shrink-0 px-3 py-1.5 text-xs">
                  Actualizar
                </Link>
              </div>
            )}

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
                    Sin responder · {EVENT_CATEGORY_LABEL[event.category]} — cierra el{" "}
                    {EVENT_DATE_FORMATTER.format(event.signupsCloseAt)}
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
          <h2 className="font-semibold text-foreground">Estás al día</h2>
          <p className="text-sm text-muted">No tienes encuestas de asistencia ni actualizaciones de ficha pendientes.</p>
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      {/* ============ PERFIL + NOTIFICACIONES ============ */}
      {session?.discordId ? (
        <>
          <ProfileSection discordId={session.discordId} aside={notifications} />
          <UpcomingRosters discordId={session.discordId} />
        </>
      ) : (
        // Sesión de usuario/contraseña del admin: no hay cuenta de Discord
        // de la que mostrar un perfil.
        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h1 className="heading-gradient text-2xl font-extrabold sm:text-3xl">
            {sidebarSession?.label ?? siteConfig.name}
          </h1>
          <p className="mt-2 text-sm text-muted">Inicia sesión con Discord para ver tu perfil de jugador.</p>
        </section>
      )}

      {/* ============ BUILD CLASS PVP ============ */}
      <div className="mt-8">
        <BuildClassTabs className={className} chain={primaryBuildChain} build={primaryBuild} />
      </div>
    </div>
  );
}
