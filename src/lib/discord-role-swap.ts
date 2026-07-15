/**
 * Cambia el rol de clase de un miembro en Discord: saca cualquier otro rol
 * de clase que tenga y pone el elegido. Es la operación central detrás de
 * "cambiar mi clase" tanto desde /panel/perfil (`updateMyJobClass`, el
 * propio usuario logueado) como desde el endpoint de interacciones de
 * Discord (un miembro cualquiera clickeando un botón) — por eso no toca
 * Prisma acá: cada llamador persiste el resultado donde le corresponda.
 */

import { addGuildMemberRole, getGuildMember, getGuildRoles, removeGuildMemberRole } from "@/lib/discord-bot";
import { jobGuildRoleIds, listJobGuildRoles } from "@/lib/discord-job-roles";

export async function swapMemberJobClass(
  discordId: string,
  targetRoleId: string
): Promise<{ error?: string; roleIds?: string[] }> {
  const guildRoles = await getGuildRoles();
  const jobRoles = listJobGuildRoles(guildRoles);
  if (!jobRoles.some((role) => role.id === targetRoleId)) {
    return { error: "Esa clase no existe como rol en el server." };
  }

  const member = await getGuildMember(discordId);
  if (!member) {
    return { error: "No se encontró la membresía en el server de Discord." };
  }

  const jobIds = jobGuildRoleIds(guildRoles);
  const currentJobRoleIds = member.roles.filter((id) => jobIds.has(id));

  try {
    for (const id of currentJobRoleIds) {
      if (id !== targetRoleId) await removeGuildMemberRole(discordId, id);
    }
    if (!currentJobRoleIds.includes(targetRoleId)) {
      await addGuildMemberRole(discordId, targetRoleId);
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No se pudo actualizar el rol en Discord.",
    };
  }

  return { roleIds: [...member.roles.filter((id) => !jobIds.has(id)), targetRoleId] };
}
