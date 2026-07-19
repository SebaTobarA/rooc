import type { DiscordGuildRole } from "@/lib/discord-bot";

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
// eventos y composición de parties). Los ids son específicos de ese server;
// si algún emoji se borra o se sube de nuevo con otro id, hay que actualizar
// esta lista a mano (la API del bot no expone un lookup por nombre para
// emojis de servidor).
export const JOB_ROLE_EMOJI: Record<string, string> = {
  "Lord Knight": "<:LordKnight:1522043803240763512>",
  "Paladín": "<:Paladin:1522043805040115802>",
  Gypsy: "<:Gypsy:1522043823268696178>",
  Clown: "<:Clown:1522043819707601026>",
  Stalker: "<:Stalker:1522043812040409098>",
  Champion: "<:Champion:1522043817639936104>",
  "High Priest": "<:HighPriest:1522043866478284850>",
  Creator: "<:Creator:1522043821410615446>",
  "Assassin Cross": "<:AssassinCross:1522043816398557366>",
  Sniper: "<:Sniper:1522043809519767582>",
  Professor: "<:Professor:1522043807091265659>",
  "High Wizard": "<:HighWizard:1522043801483481160>",
  Doram: "<:doram:1519150730764619817>",
  Whitesmith: "<:Whitesmith:1522043814162727103>",
};
