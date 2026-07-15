import type { DiscordGuildRole } from "@/lib/discord-bot";

/**
 * Roles de Discord que representan la clase (job) de Ragnarok Online de un
 * miembro. Cada miembro se asigna uno de estos roles en el server y acá se
 * usa para mostrar su clase en la tarjeta de perfil del panel. Comparación
 * sin mayúsculas/acentos, con algún alias por errores de tipeo comunes en
 * el server.
 */
const JOB_ROLE_ALIASES = [
  "lord knight",
  "paladin",
  "gypsy",
  "clown",
  "stalker",
  "champion",
  "high priest",
  "creator",
  "assassin cross",
  "assasin cross",
  "sniper",
  "professor",
  "high wizard",
  "doram",
];

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .trim();
}

const JOB_ROLE_ALIAS_SET = new Set(JOB_ROLE_ALIASES);

/**
 * Dado los IDs de rol cacheados de un usuario (`User.roles`) y la lista de
 * roles del server (`getGuildRoles`/`getGuildRolesCached`), devuelve el
 * nombre del rol de clase que tiene asignado, o null si no tiene ninguno.
 * Si tuviera más de uno (no debería pasar), gana el de mayor jerarquía ya
 * que `guildRoles` viene ordenado por posición.
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
