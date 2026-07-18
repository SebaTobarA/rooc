"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";

function revalidateBuildPaths() {
  revalidatePath("/panel/build-pvp");
  revalidatePath("/panel");
}

/** Cualquiera con acceso a Build PVP puede guardar su propia build (arranca en DRAFT). */
export async function saveBuild(jobId: string, name: string, allocations: Record<string, number>) {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!permissions.canViewParty) {
    throw new Error("Tu rol no tiene permiso para guardar builds.");
  }
  if (!session?.discordId) {
    throw new Error("Necesitas haber iniciado sesión con Discord.");
  }

  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
  if (!user) throw new Error("No se encontró tu cuenta de Discord.");

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("La build necesita un nombre.");

  await prisma.savedBuild.create({
    data: {
      jobId,
      name: trimmedName,
      allocations,
      createdByDiscordId: user.discordId,
      createdByUsername: user.globalName ?? user.username,
    },
  });

  revalidateBuildPaths();
}

/** Enviar/Desactivar/Eliminar son acciones de gestión — mismo permiso que Eventos (canManageParty). */
async function requireBuildManager() {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para gestionar builds.");
  }
}

/** Libera la build a todos los jugadores cuyo rol de clase en Discord coincida con la clase de la build. */
export async function sendBuild(id: string) {
  await requireBuildManager();
  await prisma.savedBuild.update({ where: { id }, data: { status: "SENT" } });
  revalidateBuildPaths();
}

/** Vuelve a ocultar la build de los jugadores, sin borrarla del historial. */
export async function deactivateBuild(id: string) {
  await requireBuildManager();
  await prisma.savedBuild.update({ where: { id }, data: { status: "DEACTIVATED" } });
  revalidateBuildPaths();
}

export async function deleteBuild(id: string) {
  await requireBuildManager();
  await prisma.savedBuild.delete({ where: { id } });
  revalidateBuildPaths();
}

export async function renameBuild(id: string, name: string) {
  await requireBuildManager();
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("La build necesita un nombre.");
  await prisma.savedBuild.update({ where: { id }, data: { name: trimmedName } });
  revalidateBuildPaths();
}
