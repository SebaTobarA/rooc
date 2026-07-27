"use server";

/**
 * Importar jugadores al Party Builder a partir de un rol de Discord
 * arbitrario — generaliza el sync de Core Guild (src/lib/core-guild/sync.ts,
 * atado al rol fijo "[SD] Core") para que se pueda elegir cualquier rol del
 * server desde el builder (ver discord-role-import.tsx).
 */

import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { getGuildMembers, getGuildRoles } from "@/lib/discord-bot";
import { resolveJobFromRoles } from "@/lib/discord-job-roles";

async function requirePartyManager() {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para importar jugadores al Party Builder.");
  }
}

export interface DiscordRoleOption {
  id: string;
  name: string;
}

export async function listGuildRolesForImport(): Promise<DiscordRoleOption[]> {
  await requirePartyManager();
  const roles = await getGuildRoles();
  return roles.map((role) => ({ id: role.id, name: role.name }));
}

export interface ImportableDiscordMember {
  discordId: string;
  nickname: string;
  username: string;
  avatarHash: string | null;
  // Clase sugerida a partir del rol de Discord del miembro, o null si no
  // tiene ninguno asignado — en ese caso el chip queda "Sin clase" y
  // editable a mano en el pool (ver player-chip.tsx).
  suggestedClass: string | null;
}

function toImportable(
  member: Awaited<ReturnType<typeof getGuildMembers>>[number],
  roles: Awaited<ReturnType<typeof getGuildRoles>>
): ImportableDiscordMember {
  return {
    discordId: member.user.id,
    nickname: member.nick ?? member.user.global_name ?? member.user.username,
    username: member.user.username,
    avatarHash: member.user.avatar,
    suggestedClass: resolveJobFromRoles(member.roles, roles),
  };
}

export async function getMembersByDiscordRole(roleId: string): Promise<ImportableDiscordMember[]> {
  await requirePartyManager();

  const [members, roles] = await Promise.all([getGuildMembers(), getGuildRoles()]);

  return members.filter((member) => member.roles.includes(roleId)).map((m) => toImportable(m, roles));
}

/**
 * Todos los miembros del server, sin filtrar por rol ni por inscripción a
 * un evento — para poder sumar a mano a cualquiera al pool del Party
 * Builder aunque no haya respondido la encuesta de asistencia (ver
 * discord-member-picker.tsx). Ordenados por nombre visible para que el
 * buscador sea predecible.
 */
export async function listAllGuildMembers(): Promise<ImportableDiscordMember[]> {
  await requirePartyManager();

  const [members, roles] = await Promise.all([getGuildMembers(), getGuildRoles()]);

  return members
    .map((m) => toImportable(m, roles))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "es"));
}
