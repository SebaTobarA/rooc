/**
 * A qué canales se puede comunicar un evento. La lista sale en vivo del
 * server (getGuildChannels) en vez de estar fija en el código, que era el
 * motivo por el que solo aparecían Asistencia/SD2/SD3 y no se podía elegir
 * ningún otro canal.
 *
 * El canal solo dice dónde se publica: quién puede responder la encuesta se
 * elige aparte, al enviar el evento (ver Event.allowedRoleIds y
 * EventAudienceFields).
 */

import { getGuildChannelsCached, type DiscordGuildChannel } from "@/lib/discord-bot";

/**
 * Tipos de canal donde el bot puede postear un mensaje normal con embed y
 * botones: texto (0) y anuncios (5). Foros e hilos quedan afuera porque
 * necesitan crear un post/hilo en vez de un mensaje suelto, y voz/categorías
 * directamente no reciben mensajes.
 */
const PUBLISHABLE_CHANNEL_TYPES = [0, 5];
const CATEGORY_CHANNEL_TYPE = 4;

export interface EventChannelOption {
  id: string;
  /** Nombre con "#" adelante, como se ve en Discord. */
  label: string;
  /** Categoría a la que pertenece, para agrupar el selector. null = suelto. */
  category: string | null;
}

/**
 * Los canales publicables, agrupados en el orden en que se ven en Discord:
 * primero por posición de la categoría y después por la del canal dentro de
 * ella. Los canales sueltos (sin categoría) van primero, igual que en la
 * barra lateral del server.
 */
export function listEventChannelOptions(channels: DiscordGuildChannel[]): EventChannelOption[] {
  const categories = new Map(
    channels
      .filter((channel) => channel.type === CATEGORY_CHANNEL_TYPE)
      .map((channel) => [channel.id, channel])
  );

  return channels
    .filter((channel) => PUBLISHABLE_CHANNEL_TYPES.includes(channel.type))
    .map((channel) => {
      const parent = channel.parent_id ? categories.get(channel.parent_id) : undefined;
      return {
        option: { id: channel.id, label: `#${channel.name}`, category: parent?.name ?? null },
        // -1 para que los canales sin categoría queden arriba de todo.
        categoryPosition: parent?.position ?? -1,
        position: channel.position,
      };
    })
    .sort((a, b) => a.categoryPosition - b.categoryPosition || a.position - b.position)
    .map((entry) => entry.option);
}

/**
 * Los 3 canales de asistencia que estaban fijos en el código — se usan solo
 * como red de seguridad si la API de Discord no responde, para no dejar el
 * formulario de envío sin ninguna opción.
 */
export const FALLBACK_EVENT_CHANNEL_OPTIONS: EventChannelOption[] = [
  { id: "1519127820847026256", label: "#asistencia", category: null },
  { id: "1531006103561965792", label: "#asistencia-sd2", category: null },
  { id: "1531006144569413774", label: "#asistencia-sd3", category: null },
];

export async function loadEventChannelOptions(): Promise<EventChannelOption[]> {
  try {
    return listEventChannelOptions(await getGuildChannelsCached());
  } catch {
    return FALLBACK_EVENT_CHANNEL_OPTIONS;
  }
}

/** Canal donde se publica la encuesta de organización de grupos de amigos (ver survey-interactions.ts). */
export const CORE_GUILD_SURVEY_CHANNEL_ID = "1520965675903090732";
