import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGuildChannelsCached } from "@/lib/discord-bot";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { loadCorePlayers } from "@/lib/core-census/data";
import { surveyAnswer } from "@/lib/core-census/survey";
import { EVALUATION_START } from "@/lib/core-census/tier";
import { CENSUS_VOICE_CHANNELS } from "@/lib/core-census/voice";
import { BackLink } from "@/components/back-link";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { EventCensusForm, type EventCensusRow } from "@/components/core-census/event-census-form";

export const dynamic = "force-dynamic";
// Tomar lista de voz son ~78 consultas a Discord dentro de una server action
// de esta página.
export const maxDuration = 60;

export const metadata = {
  title: "Reporte de evento",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

export default async function CoreEventReportPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { template: { select: { icon: true } }, signups: true, coreRecords: true },
  });
  // Los eventos anteriores al inicio de la evaluación no se reportan.
  if (!event || event.startsAt < EVALUATION_START) notFound();

  const { players, syncError } = await loadCorePlayers({ sync: true });
  let channelNameById = new Map<string, string>();
  try {
    const channels = await getGuildChannelsCached();
    channelNameById = new Map(channels.map((channel) => [channel.id, channel.name]));
  } catch {
    // Solo afecta al texto de ayuda: se muestran los IDs de canal.
  }

  const recordById = new Map(event.coreRecords.map((record) => [record.discordId, record]));
  const signupById = new Map(event.signups.map((signup) => [signup.discordId, signup.status]));

  // El reporte es de quienes hoy están en el core, más quien ya tenía registro
  // en este evento aunque después haya perdido el rol.
  const initialRows: EventCensusRow[] = players
    .filter((player) => player.inCore || recordById.has(player.discordId))
    .map((player) => {
      const record = recordById.get(player.discordId);
      return {
        discordId: player.discordId,
        displayName: player.displayName,
        characterName: player.characterName,
        job: player.job,
        survey: surveyAnswer(signupById.get(player.discordId) ?? null, event.attendanceMode),
        inGame: record?.inGame ?? false,
        inDiscord: record?.inDiscord ?? false,
        points: record?.points ?? null,
        kills: record?.kills ?? null,
        deaths: record?.deaths ?? null,
        assists: record?.assists ?? null,
        justified: record?.justified ?? false,
        note: record?.note ?? "",
      };
    });

  const voiceChannelNames = CENSUS_VOICE_CHANNELS[event.category].map(
    (channelId) => channelNameById.get(channelId) ?? `canal ${channelId}`
  );

  return (
    <div>
      <BackLink href="/admin/evaluacion-core" label="Evaluación de CORE" />

      {syncError && (
        <div className="mb-4">
          <BotErrorNotice message={`No se pudo actualizar contra Discord, se muestra lo último guardado. ${syncError}`} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {event.template.icon ? `${event.template.icon} ` : ""}
            Reporte de {EVENT_CATEGORY_LABEL[event.category]}
          </h1>
          <p className="text-sm capitalize text-muted">{DATE_FORMATTER.format(event.startsAt)}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            event.coreCensusAt ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"
          }`}
        >
          {event.coreCensusAt ? "Reportado — puedes corregirlo y volver a guardar" : "Reporte pendiente"}
        </span>
      </div>

      <EventCensusForm eventId={event.id} initialRows={initialRows} voiceChannelNames={voiceChannelNames} />
    </div>
  );
}
