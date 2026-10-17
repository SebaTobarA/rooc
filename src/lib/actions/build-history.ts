"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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

/**
 * Las guías de clase son de solo lectura para todos menos los admin: crear,
 * editar, publicar, ocultar y borrar builds requiere ser admin del sitio.
 */
async function requireBuildManager() {
  const session = await getSession();
  if (!session?.isAdmin) {
    throw new Error("Solo un admin puede editar las guías de clase.");
  }
  return session;
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

// ---------------------------------------------------------------------------
// Guías de clase: cada build es un tipo de build de su clase con su hoja
// completa (árbol de skills + secciones de src/lib/class-guide.ts).
// ---------------------------------------------------------------------------

/** Crea un tipo de build nuevo (vacío, en borrador) para una clase y lo abre en el editor. */
export async function createGuideBuild(jobId: string, formData: FormData): Promise<void> {
  const session = await requireBuildManager();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) throw new Error("El tipo de build necesita un nombre.");

  const user = session.discordId ? await prisma.user.findUnique({ where: { discordId: session.discordId } }) : null;
  const order = await prisma.savedBuild.count({ where: { jobId } });
  const build = await prisma.savedBuild.create({
    data: {
      jobId,
      name,
      allocations: {},
      order,
      createdByDiscordId: user?.discordId ?? session.username ?? "admin",
      createdByUsername: user?.globalName ?? user?.username ?? session.username ?? "Admin",
    },
  });

  revalidateBuildPaths();
  redirect(`/panel/build-pvp?job=${jobId}&build=${build.id}`);
}

/** Guarda el árbol de skills de un tipo de build ya existente. */
export async function updateBuildAllocations(id: string, allocations: Record<string, number>): Promise<void> {
  await requireBuildManager();
  const clean = Object.fromEntries(
    Object.entries(allocations).filter(([, level]) => Number.isInteger(level) && level > 0 && level <= 20)
  );
  await prisma.savedBuild.update({ where: { id }, data: { allocations: clean } });
  revalidateBuildPaths();
}

const entrySchema = z.object({
  name: z.string().trim().min(1).max(80),
  detail: z.string().trim().max(300),
});
const sheetSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(1000),
  accessories: z.array(entrySchema).max(30),
  enchants: z.array(entrySchema).max(30),
  mounts: z.array(entrySchema).max(30),
  divineEquip: z.array(entrySchema).max(30),
});

export type GuideSheetInput = z.infer<typeof sheetSchema>;

/** Guarda nombre, descripción y secciones de la hoja de un tipo de build. */
export async function updateGuideSheet(id: string, input: GuideSheetInput): Promise<{ error?: string }> {
  await requireBuildManager();
  const parsed = sheetSchema.safeParse({
    ...input,
    // Las filas que quedaron sin nombre en el editor no se guardan.
    accessories: input.accessories.filter((entry) => entry.name.trim()),
    enchants: input.enchants.filter((entry) => entry.name.trim()),
    mounts: input.mounts.filter((entry) => entry.name.trim()),
    divineEquip: input.divineEquip.filter((entry) => entry.name.trim()),
  });
  if (!parsed.success) return { error: "Revisa los campos: hay textos demasiado largos o un nombre vacío." };

  await prisma.savedBuild.update({ where: { id }, data: parsed.data });
  revalidateBuildPaths();
  return {};
}
