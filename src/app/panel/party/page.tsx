import "./party.css";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { loadCorePlayers } from "@/lib/core-census/data";
import { readSnapshot } from "@/lib/party/template-snapshot";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { PartyPlanner, type PlannerEvent, type PlannerMember } from "@/components/party/party-planner";
import { SavedTemplates } from "@/components/party/saved-templates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Party Builder",
};

const DAY_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Santiago",
});

// Cuántos eventos próximos se ofrecen para guardar una composición (unas
// cuatro semanas de guild: martes, jueves y domingo).
const UPCOMING_EVENTS = 12;

// Vive fuera del componente para no llamar Date.now() directo en el render
// (regla react-hooks/purity). Un día de margen para poder corregir la
// composición de un evento que acaba de terminar.
function upcomingSince(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

export default async function PartyPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);

  if (!permissions.canViewParty) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Sin acceso</h1>
        <p className="mt-2 text-sm text-muted">
          Tu rol no tiene habilitada la sección de Party Builder. Si crees que es un error,
          consulta con un administrador del server.
        </p>
      </div>
    );
  }

  const { edit: editingTemplateId } = await searchParams;

  // El pool es el core de la guild: quienes tienen el rol [SD] Core, con el
  // job de su ficha (ver syncCorePlayers).
  const [{ players, syncError }, upcoming, templateToEdit] = await Promise.all([
    loadCorePlayers({ sync: true }),
    prisma.event.findMany({
      where: { endsAt: { gte: upcomingSince() } },
      orderBy: { startsAt: "asc" },
      take: UPCOMING_EVENTS,
      include: { partyTemplates: { orderBy: { updatedAt: "desc" }, take: 1 } },
    }),
    editingTemplateId
      ? prisma.partyTemplate.findUnique({ where: { id: editingTemplateId } })
      : Promise.resolve(null),
  ]);

  const members: PlannerMember[] = players
    .filter((player) => player.inCore)
    .map((player) => ({ id: player.discordId, nickname: player.characterName, clase: player.job ?? "Sin job" }));

  const events: PlannerEvent[] = upcoming.map((event) => {
    const template = event.partyTemplates[0];
    const snapshot = template ? readSnapshot(template.data) : null;
    return {
      id: event.id,
      category: event.category,
      label: DAY_FORMATTER.format(event.startsAt),
      saved: template && snapshot ? { id: template.id, data: snapshot } : null,
    };
  });

  // "Editar" desde el historial: abre esa composición en el tablero de su
  // tipo de evento. Solo sirve si quedó enlazada a un evento.
  const editingSnapshot = templateToEdit ? readSnapshot(templateToEdit.data) : null;
  const editing =
    templateToEdit && editingSnapshot && templateToEdit.eventId && permissions.canManageParty
      ? {
          id: templateToEdit.id,
          category: templateToEdit.event as "GUILD_LEAGUE" | "EMPERIUM_OVERRUN",
          eventId: templateToEdit.eventId,
          data: editingSnapshot,
        }
      : null;

  return (
    <>
      {syncError && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <BotErrorNotice message={`No se pudo actualizar el core contra Discord, se muestra lo último guardado. ${syncError}`} />
        </div>
      )}

      <PartyPlanner
        key={editing?.id ?? "new"}
        canManage={permissions.canManageParty}
        members={members}
        events={events}
        editing={editing}
      />

      {/* El historial conserva los estilos del builder anterior (party.css). */}
      <div className="party-page" style={{ paddingTop: 0 }}>
        <SavedTemplates canManageParty={permissions.canManageParty} />
      </div>
    </>
  );
}
