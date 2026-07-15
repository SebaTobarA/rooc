/**
 * Helpers de servidor para eventos de asistencia — a diferencia de
 * src/lib/actions/events.ts (server actions ligadas a formularios del
 * admin), este archivo no lleva "use server": lo llaman tanto las server
 * actions como el endpoint de interacciones de Discord (una ruta HTTP
 * cruda, no un form submit), y ahí ese directive no aplica.
 */

import type { EventSignupStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { editChannelMessage, postChannelMessage } from "@/lib/discord-bot";
import { buildEventEmbed, buildRosterComponents } from "@/lib/discord-event-embed";

function getEventsChannelId(): string {
  const id = process.env.DISCORD_EVENTS_CHANNEL_ID;
  if (!id) throw new Error("Falta DISCORD_EVENTS_CHANNEL_ID en las variables de entorno.");
  return id;
}

/**
 * Arma el embed con los signups actuales y lo publica (primera vez) o edita
 * (siguientes veces) en el canal de eventos. Se llama tanto al enviar un
 * evento desde el admin como cada vez que alguien interactúa con los
 * botones del roster en Discord.
 */
export async function renderAndPublishEmbed(eventId: string): Promise<void> {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const signups = await prisma.eventSignup.findMany({ where: { eventId } });
  const embed = buildEventEmbed(event, signups);
  const components = buildRosterComponents(eventId);

  if (event.channelId && event.messageId) {
    await editChannelMessage(event.channelId, event.messageId, { embeds: [embed], components });
    return;
  }

  const channelId = getEventsChannelId();
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
