/**
 * Helpers de servidor para eventos de asistencia — a diferencia de
 * src/lib/actions/events.ts (server actions ligadas a formularios del
 * panel), este archivo no lleva "use server": lo llaman tanto las server
 * actions como el endpoint de interacciones de Discord (una ruta HTTP
 * cruda, no un form submit), y ahí ese directive no aplica.
 */

import type { EventCategory, EventSignup, EventSignupStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { editChannelMessage, postChannelMessage } from "@/lib/discord-bot";
import {
  buildEventEmbed,
  buildRosterComponents,
  buildDeclineEventEmbed,
  buildDeclineRosterEmbed,
  buildDeclineRosterComponents,
  buildWeeklyAttendanceEmbed,
  buildWeeklyRosterEmbed,
  buildWeeklyAttendanceComponents,
} from "@/lib/discord-event-embed";
import { loadEventRoster } from "@/lib/event-roster";

/**
 * A qué canal se publican los eventos por defecto — configurable desde
 * /panel/eventos (GuildEventSettings, fila única). Reemplaza a la vieja
 * variable de entorno DISCORD_EVENTS_CHANNEL_ID.
 */
export async function getDefaultEventChannelId(): Promise<string> {
  const settings = await prisma.guildEventSettings.findFirst();
  if (!settings?.defaultChannelId) {
    throw new Error(
      "Todavía no se configuró el canal de Discord donde publicar eventos — hacelo desde /panel/eventos."
    );
  }
  return settings.defaultChannelId;
}

/**
 * Arma el embed con los signups actuales y lo publica (primera vez) o edita
 * (siguientes veces) en el canal de eventos. Se llama tanto al enviar un
 * evento desde el panel como cada vez que alguien interactúa con los
 * botones del roster en Discord.
 *
 * `targetChannelId` solo se usa en la primera publicación (quien envía el
 * evento elige a cuál de los canales de Asistencia/SD2/SD3 comunicarlo, ver
 * src/lib/discord-guild-channels.ts) — si no se pasa, cae al canal por
 * defecto configurado en /panel/eventos.
 */
export async function renderAndPublishEmbed(eventId: string, targetChannelId?: string): Promise<void> {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { template: true },
  });

  // Eventos agrupados (ej. Martes/Jueves/Domingo de una misma semana) se
  // publican como UN solo mensaje combinado — ver createAttendanceWeek.
  if (event.weekGroupId) {
    await renderAndPublishWeeklyGroup(event.weekGroupId, targetChannelId);
    return;
  }

  const signups = await prisma.eventSignup.findMany({ where: { eventId } });
  const isDecline = event.attendanceMode === "DECLINE";

  // En modo DECLINE el roster se arma con la gente del server que tiene
  // alguno de los roles habilitados (ver loadEventRoster). Si viene vacío
  // —evento publicado antes de que se eligieran roles— se cae al embed
  // viejo, que solo lista a quienes avisaron.
  const roster = isDecline ? await loadEventRoster(event.allowedRoleIds) : [];
  const embed = !isDecline
    ? buildEventEmbed(event, signups, event.template)
    : roster.length > 0
      ? buildDeclineRosterEmbed(event, roster, signups, event.template)
      : buildDeclineEventEmbed(event, signups, event.template);
  const components = isDecline ? buildDeclineRosterComponents(eventId) : buildRosterComponents(eventId);

  if (event.channelId && event.messageId) {
    await editChannelMessage(event.channelId, event.messageId, { embeds: [embed], components });
    return;
  }

  const channelId = targetChannelId ?? (await getDefaultEventChannelId());
  const message = await postChannelMessage(channelId, { embeds: [embed], components });
  await prisma.event.update({
    where: { id: eventId },
    data: { channelId, messageId: message.id, status: "PUBLISHED", publishedAt: new Date() },
  });
}

async function renderAndPublishWeeklyGroup(weekGroupId: string, targetChannelId?: string): Promise<void> {
  const events = await prisma.event.findMany({
    where: { weekGroupId },
    include: { template: true },
    orderBy: { startsAt: "asc" },
  });
  if (events.length === 0) return;

  const signups = await prisma.eventSignup.findMany({
    where: { eventId: { in: events.map((e) => e.id) } },
  });
  const signupsByEvent = new Map<string, EventSignup[]>();
  for (const signup of signups) {
    const list = signupsByEvent.get(signup.eventId) ?? [];
    list.push(signup);
    signupsByEvent.set(signup.eventId, list);
  }

  const days = events.map((event) => ({ event, signups: signupsByEvent.get(event.id) ?? [] }));

  // Los 3 días comparten los mismos roles habilitados (ver
  // createAttendanceWeek), así que el roster se arma una sola vez.
  const roster = await loadEventRoster(events[0].allowedRoleIds);
  const embed =
    roster.length > 0
      ? buildWeeklyRosterEmbed(days, roster, events[0].template)
      : buildWeeklyAttendanceEmbed(days, events[0].template);
  const components = buildWeeklyAttendanceComponents(days, roster.length > 0);

  const first = events[0];
  if (first.channelId && first.messageId) {
    await editChannelMessage(first.channelId, first.messageId, { embeds: [embed], components });
    return;
  }

  const channelId = targetChannelId ?? (await getDefaultEventChannelId());
  const message = await postChannelMessage(channelId, { embeds: [embed], components });
  await prisma.event.updateMany({
    where: { weekGroupId },
    data: { channelId, messageId: message.id, status: "PUBLISHED", publishedAt: new Date() },
  });
}

export type PendingEvent = {
  id: string;
  title: string;
  icon: string | null;
  category: EventCategory;
  signupsCloseAt: Date;
  discordUrl: string | null;
};

/**
 * Eventos PUBLISHED cuyas inscripciones siguen abiertas (signupsCloseAt en
 * el futuro) para los que este discordId todavía no tiene un EventSignup —
 * es decir, "pendiente de responder" en el canal de asistencias. La fuente
 * de verdad es la propia tabla EventSignup, que ya queda sincronizada en
 * vivo con cada clic de los botones de Discord (ver
 * src/app/api/discord/interactions/route.ts), así que no hace falta una
 * consulta aparte al bot.
 */
export async function getPendingEventsForDiscordId(
  discordId: string | null | undefined
): Promise<PendingEvent[]> {
  if (!discordId) return [];

  const openEvents = await prisma.event.findMany({
    where: { status: "PUBLISHED", signupsCloseAt: { gt: new Date() } },
    include: { template: true },
    orderBy: { signupsCloseAt: "asc" },
  });
  if (openEvents.length === 0) return [];

  const responded = await prisma.eventSignup.findMany({
    where: { discordId, eventId: { in: openEvents.map((event) => event.id) } },
    select: { eventId: true },
  });
  const respondedIds = new Set(responded.map((signup) => signup.eventId));

  const guildId = process.env.DISCORD_GUILD_ID;
  return openEvents
    .filter((event) => !respondedIds.has(event.id))
    .map((event) => ({
      id: event.id,
      title: event.title,
      icon: event.template.icon,
      category: event.category,
      signupsCloseAt: event.signupsCloseAt,
      discordUrl:
        event.channelId && event.messageId && guildId
          ? `https://discord.com/channels/${guildId}/${event.channelId}/${event.messageId}`
          : null,
    }));
}

export async function upsertEventSignup(
  eventId: string,
  discordId: string,
  data: { displayName: string; className: string; classRoleId: string; status: EventSignupStatus }
): Promise<void> {
  await prisma.eventSignup.upsert({
    where: { eventId_discordId: { eventId, discordId } },
    create: { eventId, discordId, ...data },
    update: data,
  });
}
