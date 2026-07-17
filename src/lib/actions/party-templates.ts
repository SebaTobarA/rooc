"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type PartyTemplateSnapshot = unknown;

export async function createPartyTemplate(
  event: "GUILD_LEAGUE" | "EMPERIUM_OVERRUN",
  name: string,
  data: PartyTemplateSnapshot,
  eventId?: string
) {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para publicar plantillas de party.");
  }

  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
  if (!user) throw new Error("Usuario no encontrado.");

  await prisma.partyTemplate.create({
    data: {
      event,
      name: name.trim() || "Sin nombre",
      data: data as object,
      createdById: user.id,
      eventId: eventId ?? null,
    },
  });

  revalidatePath("/panel/party");
}

export async function deletePartyTemplate(id: string) {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para borrar plantillas de party.");
  }

  await prisma.partyTemplate.delete({ where: { id } });
  revalidatePath("/panel/party");
}
