"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { swapMemberJobClass } from "@/lib/discord-role-swap";

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

  const result = await swapMemberJobClass(session.discordId, roleId);
  if (result.error || !result.roleIds) {
    return { error: result.error ?? "No se pudo actualizar tu rol en Discord." };
  }

  await prisma.user.update({
    where: { discordId: session.discordId },
    data: { roles: result.roleIds },
  });

  revalidatePath("/panel/perfil");
  revalidatePath("/panel");
  return {};
}
