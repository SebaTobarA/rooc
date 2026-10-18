"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

/** Guarda el canal de Discord por defecto donde se publican los eventos (fila única). */
export async function setDefaultEventChannel(formData: FormData) {
  await requirePermission("canManageParty");
  const channelId = String(formData.get("channelId") ?? "");
  if (!channelId) throw new Error("Elige un canal.");

  const existing = await prisma.guildEventSettings.findFirst();
  if (existing) {
    await prisma.guildEventSettings.update({
      where: { id: existing.id },
      data: { defaultChannelId: channelId },
    });
  } else {
    await prisma.guildEventSettings.create({ data: { defaultChannelId: channelId } });
  }

  revalidatePath("/panel/eventos");
}
