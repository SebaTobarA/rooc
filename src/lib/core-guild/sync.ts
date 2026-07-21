/**
 * Sync de los miembros del rol de Discord "[SD] Core" — mismo patrón que
 * /admin/members (getGuildMembers/getGuildRoles), filtrado a un rol
 * puntual. No pega a la base de datos: el merge con lo ya guardado en
 * CoreGuildBoard pasa en el cliente (ver use-core-guild-board.ts), porque
 * en este módulo nada se persiste hasta apretar "Guardar".
 */

import { getGuildMembers, getGuildRoles } from "@/lib/discord-bot";
import { resolveJobFromRoles } from "@/lib/discord-job-roles";

// Rol "[SD] Core" del server de Special Delivery.
export const CORE_GUILD_ROLE_ID = "1520562599903891526";

export interface CoreGuildRosterEntry {
  discordId: string;
  username: string;
  globalName: string | null;
  nick: string | null;
  avatarHash: string | null;
  // Clase sugerida a partir del rol de Discord (null si no tiene rol de
  // clase asignado todavía) — solo se usa para precargar jobRole en
  // miembros nuevos, nunca pisa un valor ya guardado.
  suggestedJobRole: string | null;
}

export async function getCoreGuildRoster(): Promise<CoreGuildRosterEntry[]> {
  const [members, roles] = await Promise.all([getGuildMembers(), getGuildRoles()]);

  return members
    .filter((member) => member.roles.includes(CORE_GUILD_ROLE_ID))
    .map((member) => ({
      discordId: member.user.id,
      username: member.user.username,
      globalName: member.user.global_name,
      nick: member.nick,
      avatarHash: member.user.avatar,
      suggestedJobRole: resolveJobFromRoles(member.roles, roles),
    }));
}
