/**
 * Llamadas server-only a la API de Discord autenticadas con el bot
 * (DISCORD_BOT_TOKEN), para leer miembros y roles del server de Special
 * Delivery (DISCORD_GUILD_ID). Nunca se llama desde el cliente.
 *
 * Requiere que el bot esté invitado al server y tenga el "Server Members
 * Intent" activado en el Discord Developer Portal — ver el checklist de
 * configuración entregado aparte.
 */

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

async function discordBotFetch(path: string): Promise<Response> {
  const response = await fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bot ${getBotToken()}` },
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
