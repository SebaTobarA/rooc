import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGuildChannelsCached } from "@/lib/discord-bot";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { loadCensusMembers, type CensusMember } from "@/lib/core-census/data";
import { CENSUS_VOICE_CHANNELS } from "@/lib/core-census/voice";
import { BackLink } from "@/components/back-link";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { EventCensusForm, type EventCensusRow } from "@/components/core-census/event-census-form";

export const dynamic = "force-dynamic";
// Tomar lista de voz son ~78 consultas a Discord dentro de una server action
// de esta página.
export const maxDuration = 60;

export const metadata = {
  title: "Censo de evento",
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

export default async function CoreEventCensusPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { template: { select: { icon: true } }, signups: true, coreRecords: true },
  });
  if (!event) notFound();

  let members: CensusMember[] = [];
  let channelNameById = new Map<string, string>();
  let botError: string | null = null;
  try {
    const [loadedMembers, channels] = await Promise.all([loadCensusMembers(), getGuildChannelsCached()]);
    members = loadedMembers;
    channelNameById = new Map(channels.map((channel) => [channel.id, channel.name]));
  } catch (err) {
    botError = err instanceof Error ? err.message : "Error desconocido";
  }
  if (botError) return <BotErrorNotice message={botError} />;

  const recordById = new Map(event.coreRecords.map((record) => [record.discordId, record]));
  const signupById = new Map(event.signups.map((signup) => [signup.discordId, signup.status]));

  const initialRows: EventCensusRow[] = members
    .map((member) => {
      const record = recordById.get(member.discordId);
      const signup = signupById.get(member.discordId);
      return {
        discordId: member.discordId,
        displayName: member.displayName,
        characterName: member.characterName,
        job: member.job,
        notice: signup === "NOT_ATTENDING" || signup === "LATE" ? signup : null,
        inGame: record?.inGame ?? false,
        inDiscord: record?.inDiscord ?? false,
        points: record?.points ?? null,
        kills: record?.kills ?? null,
        deaths: record?.deaths ?? null,
        assists: record?.assists ?? null,
        justified: record?.justified ?? false,
        note: record?.note ?? "",
      };
    })
    .sort((a, b) => a.characterName.localeCompare(b.characterName));

  const voiceChannelNames = CENSUS_VOICE_CHANNELS[event.category].map(
    (channelId) => channelNameById.get(channelId) ?? `canal ${channelId}`
  );

  return (
    <div>
      <BackLink href="/admin/core-guild/censo" label="Censo" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {event.template.icon ? `${event.template.icon} ` : ""}
            {EVENT_CATEGORY_LABEL[event.category]}
          </h1>
          <p className="text-sm capitalize text-muted">{DATE_FORMATTER.format(event.startsAt)}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            event.coreCensusAt ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"
          }`}
        >
          {event.coreCensusAt ? "Censado — puedes corregirlo y volver a guardar" : "Pendiente de censo"}
        </span>
      </div>

      <EventCensusForm eventId={event.id} initialRows={initialRows} voiceChannelNames={voiceChannelNames} />
    </div>
  );
}
