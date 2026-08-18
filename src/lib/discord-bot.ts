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
    throw new Error("Discord rate-limited la petición del bot. Prueba de nuevo en unos segundos.");
  }
  return response;
}

export type DiscordGuildMember = {
  user: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
    /** Solo viene en las cuentas de bot; en las de persona Discord lo omite. */
    bot?: boolean;
  };
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
  /** Un embed muestra una sola imagen: para varias hacen falta varios embeds
   *  (hasta 10 por mensaje). Ver buildApplicationEmbeds. */
  image?: { url: string };
  author?: { name: string; icon_url?: string };
};

/** Estilos de botón de la API de Discord (1=azul, 2=gris, 3=verde, 4=rojo). */
export type DiscordButtonStyle = 1 | 2 | 3 | 4;

export type DiscordButton = {
  type: 2;
  style: DiscordButtonStyle;
  label: string;
  custom_id: string;
};

export type DiscordSelectOption = {
  label: string;
  value: string;
  description?: string;
};

/** Menú desplegable de una sola elección (component_type 3) — ocupa toda su fila, no se puede combinar con botones en la misma. */
export type DiscordSelectMenu = {
  type: 3;
  custom_id: string;
  placeholder?: string;
  options: DiscordSelectOption[];
};

export type DiscordActionRow = {
  type: 1;
  components: (DiscordButton | DiscordSelectMenu)[];
};

/** Estilos de campo de texto de un modal (1=una línea, 2=párrafo). */
export type DiscordTextInputStyle = 1 | 2;

export type DiscordTextInput = {
  type: 4;
  custom_id: string;
  label: string;
  style: DiscordTextInputStyle;
  required?: boolean;
  placeholder?: string;
  max_length?: number;
};

export type DiscordModalActionRow = {
  type: 1;
  components: DiscordTextInput[];
};

/** Formulario emergente (interaction response type 9) — la única forma de pedir texto libre en una interacción de Discord. */
export type DiscordModal = {
  custom_id: string;
  title: string;
  components: DiscordModalActionRow[];
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
 * Crea un rol nuevo en el server (ej. para identificar a un equipo de
 * amigos en Core Guild) — el rol queda por debajo de la jerarquía del bot,
 * así que después se le puede asignar a miembros con addGuildMemberRole sin
 * problema de permisos.
 */
export async function createGuildRole(name: string): Promise<DiscordGuildRole> {
  const response = await discordBotFetch(`/guilds/${getGuildId()}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(`No se pudo crear el rol en Discord (${response.status}).`);
  }
  return response.json();
}

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
  body: {
    content?: string;
    embeds?: DiscordEmbed[];
    components?: DiscordActionRow[];
    /** `{ parse: [] }` deja las menciones visibles pero sin notificar a nadie. */
    allowed_mentions?: { parse: string[] };
  }
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
  body: { content?: string; embeds?: DiscordEmbed[]; components?: DiscordActionRow[] }
): Promise<boolean> {
  const response = await discordBotFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // 404 = el mensaje ya no está (alguien lo borró a mano en Discord). No es
  // un error del que haya que avisar: quien llama decide qué hacer, y en el
  // caso de los eventos lo que corresponde es publicarlo de nuevo (ver
  // renderAndPublishEmbed).
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(`No se pudo editar el mensaje en Discord (${response.status}).`);
  }
  return true;
}

/**
 * Borra un mensaje publicado por el bot (ej. al eliminar un evento ya
 * enviado a Discord). Se ignora un 404 (el mensaje ya no existe, por
 * ejemplo si alguien lo borró a mano antes) para que borrar el evento en
 * la app nunca falle por algo que ya no está en Discord.
 */
export async function deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
  const response = await discordBotFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`No se pudo borrar el mensaje en Discord (${response.status}).`);
  }
}

export type DiscordGuildChannel = {
  id: string;
  name: string;
  type: number;
  position: number;
  /** Categoría que lo contiene (un canal type 4), o null si está suelto arriba de todo. */
  parent_id: string | null;
};

/**
 * Todos los canales del server tal como los devuelve Discord, ordenados por
 * posición. Sin filtrar por tipo: quién puede recibir un evento lo decide
 * listEventChannelOptions (ver discord-guild-channels.ts), que además los
 * agrupa por categoría.
 */
export async function getGuildChannels(): Promise<DiscordGuildChannel[]> {
  const response = await discordBotFetch(`/guilds/${getGuildId()}/channels`);
  if (!response.ok) {
    throw new Error(`No se pudieron obtener los canales del server (${response.status}).`);
  }
  const channels = (await response.json()) as DiscordGuildChannel[];
  return channels.sort((a, b) => a.position - b.position);
}

/** Como getGuildChannels pero cacheada 5 minutos — los canales casi no cambian. */
export const getGuildChannelsCached = unstable_cache(getGuildChannels, ["guild-channels"], {
  revalidate: 300,
});

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
