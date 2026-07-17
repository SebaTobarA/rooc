/**
 * Helpers de servidor para eventos de asistencia — a diferencia de
 * src/lib/actions/events.ts (server actions ligadas a formularios del
 * panel), este archivo no lleva "use server": lo llaman tanto las server
 * actions como el endpoint de interacciones de Discord (una ruta HTTP
 * cruda, no un form submit), y ahí ese directive no aplica.
 */

import type { EventSignupStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { editChannelMessage, postChannelMessage } from "@/lib/discord-bot";
import { buildEventEmbed, buildRosterComponents } from "@/lib/discord-event-embed";

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
 */
export async function renderAndPublishEmbed(eventId: string): Promise<void> {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { template: true },
  });
  const signups = await prisma.eventSignup.findMany({ where: { eventId } });
  const embed = buildEventEmbed(event, signups, event.template);
  const components = buildRosterComponents(eventId);

  if (event.channelId && event.messageId) {
    await editChannelMessage(event.channelId, event.messageId, { embeds: [embed], components });
    return;
  }

  const channelId = await getDefaultEventChannelId();
  const message = await postChannelMessage(channelId, { embeds: [embed], components });
  await prisma.event.update({
    where: { id: eventId },
    data: { channelId, messageId: message.id, status: "PUBLISHED", publishedAt: new Date() },
  });
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
