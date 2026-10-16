import type { DiscordGuildEmoji, DiscordGuildRole } from "@/lib/discord-bot";

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .trim();
}

/**
 * Roles de Discord que representan la clase (job) de Ragnarok Online de un
 * miembro — se crean una vez en el server y cada miembro tiene como máximo
 * uno asignado. Nombres canónicos, en el orden en que se muestran en el
 * selector de /panel/perfil.
 */
export const JOB_ROLE_NAMES = [
  "Lord Knight",
  "Paladín",
  "Gypsy",
  "Clown",
  "Stalker",
  "Champion",
  "High Priest",
  "Creator",
  "Whitesmith",
  "Assassin Cross",
  "Sniper",
  "Gunslinger",
  "Professor",
  "High Wizard",
  "Doram",
] as const;

// Alias por errores de tipeo comunes en el server (comparación normalizada).
const JOB_ROLE_ALIAS_SET = new Set([...JOB_ROLE_NAMES.map(normalize), normalize("Assasin Cross")]);

/**
 * Dado los IDs de rol de un usuario (de `User.roles` o de un
 * `DiscordGuildMember.roles` en vivo) y la lista de roles del server
 * (`getGuildRoles`/`getGuildRolesCached`), devuelve el nombre del rol de
 * clase que tiene asignado, o null si no tiene ninguno. Si tuviera más de
 * uno (no debería pasar), gana el de mayor jerarquía ya que `guildRoles`
 * viene ordenado por posición.
 */
export function resolveJobFromRoles(
  userRoleIds: string[],
  guildRoles: Pick<DiscordGuildRole, "id" | "name">[]
): string | null {
  const userRoleIdSet = new Set(userRoleIds);
  const match = guildRoles.find(
    (role) => userRoleIdSet.has(role.id) && JOB_ROLE_ALIAS_SET.has(normalize(role.name))
  );
  return match?.name ?? null;
}

/**
 * Los roles de clase tal como existen hoy en el server (id real + nombre),
 * en el orden canónico de JOB_ROLE_NAMES — para poblar el selector de
 * clase en /panel/perfil. Si algún rol todavía no fue creado en Discord,
 * se omite de la lista en vez de romper la página.
 */
export function listJobGuildRoles(
  guildRoles: Pick<DiscordGuildRole, "id" | "name">[]
): { id: string; name: string }[] {
  const byNormalizedName = new Map(guildRoles.map((role) => [normalize(role.name), role]));
  return JOB_ROLE_NAMES.map((canonicalName) => byNormalizedName.get(normalize(canonicalName))).filter(
    (role): role is Pick<DiscordGuildRole, "id" | "name"> => Boolean(role)
  );
}

/** IDs de todos los roles de clase existentes en el server (para diffear altas/bajas). */
export function jobGuildRoleIds(guildRoles: Pick<DiscordGuildRole, "id" | "name">[]): Set<string> {
  return new Set(listJobGuildRoles(guildRoles).map((role) => role.id));
}

// Emojis personalizados del server de Special Delivery, uno por clase — se
// anteponen al nombre de cada jugador en los embeds de roster (asistencia a
// eventos y composición de parties) y en el selector de job del registro.
//
// Antes los ids estaban escritos a mano acá y, al volver a subir los emojis
// en Discord (cambian de id), los embeds mostraban ":LordKnight:" en texto.
// Ahora se resuelven en vivo con la lista de emojis del server, buscando por
// nombre: "LordKnight", "lord_knight", "LK_LordKnight", etc. sirven para
// "Lord Knight". Un job sin emoji en el server se muestra sin ícono.
//
// JOB_ROLE_EMOJI se rellena con loadJobRoleEmojis() (discord-job-emojis.ts,
// solo servidor), que hay que esperar
// en la capa con I/O antes de armar un embed (los builders son puros y lo
// leen de forma síncrona).
export const JOB_ROLE_EMOJI: Record<string, string> = {};

/** Nombres alternativos de emoji aceptados por job (comparación normalizada). */
const JOB_EMOJI_ALIASES: Partial<Record<(typeof JOB_ROLE_NAMES)[number], string[]>> = {
  "Lord Knight": ["lk"],
  "Paladín": ["pala"],
  "High Priest": ["hp"],
  "High Wizard": ["hw", "hwiz"],
  "Assassin Cross": ["assasincross", "sinx", "ax"],
  Whitesmith: ["ws", "mastersmith"],
  Creator: ["biochemist"],
  Clown: ["minstrel"],
  Gypsy: ["wanderer"],
  Professor: ["scholar"],
  Gunslinger: ["gs", "rebel", "rebelion", "rebellion"],
  Doram: ["summoner"],
};

function emojiKey(name: string): string {
  return normalize(name).replace(/[^a-z0-9]/g, "");
}

function emojiMarkup(emoji: DiscordGuildEmoji): string {
  return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
}

/**
 * Empareja cada job con un emoji del server. Prioridad: nombre exacto
 * (normalizado), luego un alias exacto, y por último un emoji cuyo nombre
 * contenga el nombre del job (ej. "ro_lordknight"); ante empate gana el
 * nombre más corto.
 */
export function matchJobRoleEmojis(emojis: DiscordGuildEmoji[]): Record<string, string> {
  const usable = emojis
    .filter((emoji) => emoji.id && emoji.name && emoji.available !== false)
    .map((emoji) => ({ emoji, key: emojiKey(emoji.name) }))
    .sort((a, b) => a.key.length - b.key.length);

  const result: Record<string, string> = {};
  for (const job of JOB_ROLE_NAMES) {
    const jobKey = emojiKey(job);
    const aliases = (JOB_EMOJI_ALIASES[job] ?? []).map(emojiKey);
    const match =
      usable.find(({ key }) => key === jobKey) ??
      usable.find(({ key }) => aliases.includes(key)) ??
      usable.find(({ key }) => key.includes(jobKey));
    if (match) result[job] = emojiMarkup(match.emoji);
  }
  return result;
}

/** Emoji de un job por nombre de rol, tolerando tildes y el alias "Assasin Cross". */
export function jobRoleEmoji(jobName: string): string | undefined {
  if (JOB_ROLE_EMOJI[jobName]) return JOB_ROLE_EMOJI[jobName];
  const key = emojiKey(jobName === "Assasin Cross" ? "Assassin Cross" : jobName);
  const canonical = JOB_ROLE_NAMES.find((job) => emojiKey(job) === key);
  return canonical ? JOB_ROLE_EMOJI[canonical] : undefined;
}
