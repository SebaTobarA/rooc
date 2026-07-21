"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
