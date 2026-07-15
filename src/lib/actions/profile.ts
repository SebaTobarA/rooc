"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addGuildMemberRole,
  getGuildMember,
  getGuildRoles,
  removeGuildMemberRole,
} from "@/lib/discord-bot";
import { jobGuildRoleIds, listJobGuildRoles } from "@/lib/discord-job-roles";

/**
 * Cambia la clase (job) del usuario logueado: la fuente de verdad es
 * Discord, así que primero movemos el rol ahí (sacamos cualquier otro rol
 * de clase que tenga y ponemos el elegido) y recién después actualizamos
 * el cache local (`User.roles`) para que el resto del panel (ej. la
 * tarjeta del sidebar) lo vea sin esperar al próximo login.
 */
export async function updateMyJobClass(roleId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session?.discordId) {
    return { error: "Necesitás haber iniciado sesión con Discord." };
  }

  const guildRoles = await getGuildRoles();
  const jobRoles = listJobGuildRoles(guildRoles);
  if (!jobRoles.some((role) => role.id === roleId)) {
    return { error: "Esa clase no existe como rol en el server." };
  }

  const member = await getGuildMember(session.discordId);
  if (!member) {
    return { error: "No se encontró tu membresía en el server de Discord." };
  }

  const jobIds = jobGuildRoleIds(guildRoles);
  const currentJobRoleIds = member.roles.filter((id) => jobIds.has(id));

  try {
    for (const id of currentJobRoleIds) {
      if (id !== roleId) await removeGuildMemberRole(session.discordId, id);
    }
    if (!currentJobRoleIds.includes(roleId)) {
      await addGuildMemberRole(session.discordId, roleId);
    }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "No se pudo actualizar tu rol en Discord.",
    };
  }

  const updatedRoles = [...member.roles.filter((id) => !jobIds.has(id)), roleId];
  await prisma.user.update({
    where: { discordId: session.discordId },
    data: { roles: updatedRoles },
  });

  revalidatePath("/panel/perfil");
  revalidatePath("/panel");
  return {};
}
