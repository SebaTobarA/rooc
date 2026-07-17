/**
 * Llamadas server-only a la API de Discord autenticadas con el bot
 * (DISCORD_BOT_TOKEN), para leer miembros y roles del server de Special
 * Delivery (DISCORD_GUILD_ID). Nunca se llama desde el cliente.
 *
 * Requiere que el bot esté invitado al server y tenga el "Server Members
 * Intent" activado en el Discord Developer Portal — ver el checklist de
 * configuración entregado aparte.
 */

import { unstable_cache } from "next/cache";

const DISCORD_API = "https://discord.com/api/v10";

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("Falta DISCORD_BOT_TOKEN en las variables de entorno.");
  return token;
}

function getGuildId(): string {
  const id = process.env.DISCORD_GUILD_ID;
  if (!id) throw new Error("Falta DISCORD_GUILD_ID en las variables de entorno.");
  return id;
}

async function discordBotFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bot ${getBotToken()}` },
    cache: "no-store",
  });
  if (response.status === 429) {
    throw new Error("Discord rate-limited la petición del bot. Probá de nuevo en unos segundos.");
  }
  return response;
}

export type DiscordGuildMember = {
  user: { id: string; username: string; global_name: string | null; avatar: string | null };
  nick: string | null;
  roles: string[];
  joined_at: string;
};

export type DiscordGuildRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

/** Estilos de botón de la API de Discord (1=azul, 2=gris, 3=verde, 4=rojo). */
export type DiscordButtonStyle = 1 | 2 | 3 | 4;

export type DiscordButton = {
  type: 2;
  style: DiscordButtonStyle;
  label: string;
  custom_id: string;
};

export type DiscordActionRow = {
  type: 1;
  components: DiscordButton[];
};

/** Un solo miembro por ID. Devuelve null si no pertenece al server (404). */
export async function getGuildMember(discordId: string): Promise<DiscordGuildMember | null> {
  const response = await discordBotFetch(`/guilds/${getGuildId()}/members/${discordId}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`No se pudo verificar la membresía en el server (${response.status}).`);
  }
  return response.json();
}

/** Todos los roles del server, ordenados por posición (mayor jerarquía primero). */
export async function getGuildRoles(): Promise<DiscordGuildRole[]> {
  const response = await discordBotFetch(`/guilds/${getGuildId()}/roles`);
  if (!response.ok) {
    throw new Error(`No se pudieron obtener los roles del server (${response.status}).`);
  }
  const roles = (await response.json()) as DiscordGuildRole[];
  return roles
    .filter((role) => role.name !== "@everyone")
    .sort((a, b) => b.position - a.position);
}

/**
 * Como getGuildRoles pero cacheada 5 minutos — pensada para el layout del
 * panel, que se ejecuta en cada navegación y no necesita ver cambios de rol
 * al instante. /admin/roles sigue usando la versión sin cache de arriba
 * para reflejar cambios apenas se guardan.
 */
export const getGuildRolesCached = unstable_cache(getGuildRoles, ["guild-roles"], {
  revalidate: 300,
});

/**
 * Asigna/quita un rol a un miembro puntual — usado para mantener sincronizada
 * la clase elegida en /panel/perfil con el rol real en Discord. Requiere que
 * el rol del bot esté por encima del rol de clase en la jerarquía del server
 * (si no, Discord devuelve 403).
 */
export async function addGuildMemberRole(discordId: string, roleId: string): Promise<void> {
  const response = await discordBotFetch(
    `/guilds/${getGuildId()}/members/${discordId}/roles/${roleId}`,
    { method: "PUT" }
  );
  if (!response.ok) {
    throw new Error(`No se pudo asignar el rol en Discord (${response.status}).`);
  }
}

export async function removeGuildMemberRole(discordId: string, roleId: string): Promise<void> {
  const response = await discordBotFetch(
    `/guilds/${getGuildId()}/members/${discordId}/roles/${roleId}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    throw new Error(`No se pudo quitar el rol en Discord (${response.status}).`);
  }
}

/** Postea un mensaje nuevo (con embed y/o botones) en un canal. Devuelve el ID del mensaje creado. */
export async function postChannelMessage(
  channelId: string,
  body: { embeds?: DiscordEmbed[]; components?: DiscordActionRow[] }
): Promise<{ id: string }> {
  const response = await discordBotFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`No se pudo publicar el mensaje en Discord (${response.status}).`);
  }
  return response.json();
}

/** Edita un mensaje ya publicado por el bot (ej. para refrescar el roster de un evento). */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  body: { embeds?: DiscordEmbed[]; components?: DiscordActionRow[] }
): Promise<void> {
  const response = await discordBotFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`No se pudo editar el mensaje en Discord (${response.status}).`);
  }
}

export type DiscordGuildChannel = {
  id: string;
  name: string;
  type: number;
  position: number;
};

/** Canales de texto del server (type 0), ordenados por posición — para el selector de canal de eventos. */
export async function getGuildChannels(): Promise<DiscordGuildChannel[]> {
  const response = await discordBotFetch(`/guilds/${getGuildId()}/channels`);
  if (!response.ok) {
    throw new Error(`No se pudieron obtener los canales del server (${response.status}).`);
  }
  const channels = (await response.json()) as DiscordGuildChannel[];
  return channels.filter((channel) => channel.type === 0).sort((a, b) => a.position - b.position);
}

/** Todos los miembros del server, paginado (Discord devuelve como máximo 1000 por página). */
export async function getGuildMembers(): Promise<DiscordGuildMember[]> {
  const members: DiscordGuildMember[] = [];
  let after = "0";

  for (;;) {
    const response = await discordBotFetch(
      `/guilds/${getGuildId()}/members?limit=1000&after=${after}`
    );
    if (!response.ok) {
      throw new Error(`No se pudo obtener la lista de miembros (${response.status}).`);
    }
    const page = (await response.json()) as DiscordGuildMember[];
    members.push(...page);
    if (page.length < 1000) break;
    after = page[page.length - 1].user.id;
  }

  return members;
}
