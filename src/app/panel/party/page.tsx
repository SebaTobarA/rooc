import "./party.css";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { loadCorePlayers } from "@/lib/core-census/data";
import { readSnapshot } from "@/lib/party/template-snapshot";
import { readSavedPartyPlayers, type SavedPartyView } from "@/lib/party/saved-parties";
import { loadJobColors } from "@/lib/party/job-colors-store";
import { loadDraft } from "@/lib/party/draft";
import type { DraftPayload } from "@/lib/party/draft-ops";
import { loadEventChannelOptions } from "@/lib/discord-guild-channels";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import {
  PartyPlanner,
  type PlannerAttendance,
  type PlannerComposition,
  type PlannerEventType,
  type PlannerMember,
} from "@/components/party/party-planner";
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

const CATEGORIES = ["GUILD_LEAGUE", "EMPERIUM_OVERRUN"] as const satisfies readonly PlannerEventType[];

// Vive fuera del componente para no llamar Date.now() directo en el render
// (regla react-hooks/purity).
function now(): Date {
  return new Date();
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
  const since = now();

  // El pool es el core de la guild: quienes tienen el rol [SD] Core, con el
  // job de su ficha (ver syncCorePlayers).
  const [
    { players, syncError },
    permanentTemplates,
    nextEvents,
    channels,
    settings,
    templateToEdit,
    draftList,
    savedPartyRows,
    jobColors,
  ] = await Promise.all([
      loadCorePlayers({ sync: true }),
      prisma.partyTemplate.findMany({ where: { permanent: true }, orderBy: { updatedAt: "desc" } }),
      // El próximo evento de cada tipo, para cruzar la composición con quién
      // avisó que juega.
      Promise.all(
        CATEGORIES.map((category) =>
          prisma.event.findFirst({
            where: { category, endsAt: { gte: since } },
            orderBy: { startsAt: "asc" },
            include: { signups: { select: { discordId: true, status: true } } },
          })
        )
      ),
      permissions.canManageParty ? loadEventChannelOptions() : Promise.resolve([]),
      prisma.guildEventSettings.findFirst(),
      editingTemplateId
        ? prisma.partyTemplate.findUnique({ where: { id: editingTemplateId } })
        : Promise.resolve(null),
      // El borrador compartido que editan los oficiales; quien solo mira ve
      // la composición publicada.
      permissions.canManageParty ? Promise.all(CATEGORIES.map((category) => loadDraft(category))) : Promise.resolve(null),
      // Parties guardadas, compartidas por los dos tipos de evento.
      permissions.canManageParty
        ? prisma.savedParty.findMany({ orderBy: { name: "asc" } })
        : Promise.resolve([]),
      loadJobColors(),
    ]);
  const savedParties: SavedPartyView[] = savedPartyRows.map((row) => ({
    id: row.id,
    name: row.name,
    players: readSavedPartyPlayers(row.players),
    updatedByName: row.updatedByName,
    updatedAt: row.updatedAt.toISOString(),
  }));
  const drafts = draftList
    ? (Object.fromEntries(CATEGORIES.map((category, index) => [category, draftList[index]])) as Record<
        PlannerEventType,
        DraftPayload
      >)
    : null;

  const members: PlannerMember[] = players
    .filter((player) => player.inCore)
    .map((player) => ({ id: player.discordId, nickname: player.characterName, clase: player.job ?? "Sin job" }));

  const compositions = Object.fromEntries(
    CATEGORIES.map((category) => {
      const template = permanentTemplates.find((candidate) => candidate.event === category);
      const snapshot = template ? readSnapshot(template.data) : null;
      const composition: PlannerComposition | null =
        template && snapshot
          ? { id: template.id, data: snapshot, channelId: template.channelId, updatedAt: template.updatedAt.toISOString() }
          : null;
      return [category, composition];
    })
  ) as Record<PlannerEventType, PlannerComposition | null>;

  const attendance = Object.fromEntries(
    CATEGORIES.map((category, index) => {
      const event = nextEvents[index];
      const entry: PlannerAttendance | null = event
        ? {
            label: DAY_FORMATTER.format(event.startsAt),
            published: event.status === "PUBLISHED",
            mode: event.attendanceMode,
            statuses: Object.fromEntries(event.signups.map((signup) => [signup.discordId, signup.status])),
          }
        : null;
      return [category, entry];
    })
  ) as Record<PlannerEventType, PlannerAttendance | null>;

  // "Editar" desde el historial: abre esa composición en el tablero de su
  // tipo de evento; al guardarla pasa a ser la composición vigente.
  const editingSnapshot = templateToEdit ? readSnapshot(templateToEdit.data) : null;
  const editing =
    templateToEdit && editingSnapshot && permissions.canManageParty
      ? { id: templateToEdit.id, category: templateToEdit.event as PlannerEventType, data: editingSnapshot }
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
        compositions={compositions}
        drafts={drafts}
        savedParties={savedParties}
        jobColors={jobColors}
        attendance={attendance}
        channels={channels}
        defaultChannelId={settings?.defaultChannelId ?? null}
        editing={editing}
      />

      {/* El historial conserva los estilos del builder anterior (party.css). */}
      <div className="party-page" style={{ paddingTop: 0 }}>
        <SavedTemplates canManageParty={permissions.canManageParty} />
      </div>
    </>
  );
}
