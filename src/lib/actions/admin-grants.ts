"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Otorga admin a un miembro del server elegido desde /admin/roles. Solo
 * llamable por alguien que ya es admin (la ruta entera está gateada por
 * proxy.ts a session.isAdmin) — se revalida acá también por las dudas.
 */
export async function addAdminGrant(formData: FormData) {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error("No tienes permiso para otorgar admin.");

  const discordId = String(formData.get("discordId") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const avatarHash = String(formData.get("avatarHash") ?? "").trim() || null;
  if (!discordId || !username) return;

  await prisma.adminGrant.upsert({
    where: { discordId },
    create: { discordId, username, avatarHash, grantedByDiscordId: session.discordId ?? null },
    update: { username, avatarHash },
  });

  revalidatePath("/admin/roles");
}

export async function removeAdminGrant(id: string) {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error("No tienes permiso para quitar admin.");

  await prisma.adminGrant.delete({ where: { id } });
  revalidatePath("/admin/roles");
}
