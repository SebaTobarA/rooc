/**
 * Canales de voz que cuentan como "participó en Discord" según el evento:
 * Guild League (martes y jueves) se reparte en dos canales; Emperium Overrun
 * (domingo) va todo junto en el primero.
 */

import type { EventCategory } from "@prisma/client";
import { getMemberVoiceChannelId } from "@/lib/discord-bot";

const VOICE_CHANNEL_MAIN = "1531808640766574792";
const VOICE_CHANNEL_SECOND = "1531060738742026290";

export const CENSUS_VOICE_CHANNELS: Record<EventCategory, string[]> = {
  GUILD_LEAGUE: [VOICE_CHANNEL_MAIN, VOICE_CHANNEL_SECOND],
  EMPERIUM_OVERRUN: [VOICE_CHANNEL_MAIN],
};

// Cuántas consultas de voz van en paralelo: suficiente para que ~78 miembros
// entren cómodos en una sola llamada sin gatillar el rate limit de Discord.
const VOICE_CONCURRENCY = 5;

/** De los discordId dados, cuáles están ahora mismo en un canal de voz del evento. */
export async function findMembersInEventVoice(category: EventCategory, discordIds: string[]): Promise<string[]> {
  const allowed = new Set(CENSUS_VOICE_CHANNELS[category]);
  const present: string[] = [];
  const queue = [...discordIds];

  async function worker() {
    for (let discordId = queue.shift(); discordId !== undefined; discordId = queue.shift()) {
      const channelId = await getMemberVoiceChannelId(discordId);
      if (channelId && allowed.has(channelId)) present.push(discordId);
    }
  }

  await Promise.all(Array.from({ length: VOICE_CONCURRENCY }, worker));
  return present;
}
