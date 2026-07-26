"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addGuildMemberRole, createGuildRole } from "@/lib/discord-bot";
import type { CoreGuildBoardData } from "@/lib/core-guild/types";

// Sin chequeo de permiso explícito: /admin/core-guild ya está detrás del
// gate de admin del sitio en src/proxy.ts (mismo patrón que
// src/lib/actions/leadership.ts), y las server actions se postean a esa
// misma ruta protegida.

async function resolveUpdatedByUsername(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.discordId) {
    const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
    return user?.globalName ?? user?.username ?? null;
  }
  return session.username ?? null;
}

export async function saveCoreGuildBoard(data: CoreGuildBoardData): Promise<void> {
  const session = await getSession();
  const existing = await prisma.coreGuildBoard.findFirst();
  const updatedByUsername = await resolveUpdatedByUsername();

  const payload = {
    data: data as object,
    locked: true,
    updatedByDiscordId: session?.discordId ?? null,
    updatedByUsername,
  };

  if (existing) {
    await prisma.coreGuildBoard.update({ where: { id: existing.id }, data: payload });
  } else {
    await prisma.coreGuildBoard.create({ data: payload });
  }

  revalidatePath("/admin/core-guild");
}

export async function unlockCoreGuildBoard(): Promise<void> {
  const existing = await prisma.coreGuildBoard.findFirst();
  if (!existing) return;

  await prisma.coreGuildBoard.update({ where: { id: existing.id }, data: { locked: false } });
  revalidatePath("/admin/core-guild");
}

/**
 * Crea el rol de un equipo de amigos en Discord (nombrado igual que la
 * etiqueta) y se lo asigna a todos sus miembros. Se llama desde la sección
 * Amigos una vez que todas las parties del equipo quedaron con el candado
 * cerrado — no toca Prisma, el ID del rol se guarda en teamRoles recién
 * cuando el admin aprieta "Guardar" en el board (mismo patrón "todo es
 * borrador hasta guardar" que el resto de Core Guild).
 */
export async function createTeamDiscordRole(
  teamName: string,
  discordIds: string[]
): Promise<{ roleId?: string; error?: string; failedIds?: string[] }> {
  let roleId: string;
  try {
    const role = await createGuildRole(teamName);
    roleId = role.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el rol en Discord." };
  }

  const failedIds: string[] = [];
  for (const discordId of discordIds) {
    try {
      await addGuildMemberRole(discordId, roleId);
    } catch {
      failedIds.push(discordId);
    }
  }

  return { roleId, failedIds: failedIds.length > 0 ? failedIds : undefined };
}
