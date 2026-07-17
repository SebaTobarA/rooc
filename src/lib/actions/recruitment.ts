"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import type { ApplicationStatus } from "@prisma/client";

/**
 * Envía la postulación de ingreso a la guild del usuario logueado. Requiere
 * sesión de Discord (no la de usuario/contraseña del admin, que no tiene
 * discordId). No permite un segundo envío mientras ya haya una fila para
 * ese discordId — /panel/postulacion muestra el estado en vez del form.
 */
export async function submitApplication(formData: FormData) {
  const session = await getSession();
  if (!session?.discordId) throw new Error("Necesitas haber iniciado sesión con Discord.");

  const existing = await prisma.guildApplication.findUnique({
    where: { discordId: session.discordId },
  });
  if (existing) return;

  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
  if (!user) throw new Error("No se encontró tu cuenta de Discord.");

  const characterName = String(formData.get("characterName") ?? "").trim();
  const className = String(formData.get("className") ?? "").trim();
  const levelText = String(formData.get("levelText") ?? "").trim();
  const availability = String(formData.get("availability") ?? "").trim();
  const aboutYou = String(formData.get("aboutYou") ?? "").trim();

  if (!characterName || !className || !availability) return;

  await prisma.guildApplication.create({
    data: {
      discordId: user.discordId,
      discordUsername: user.username,
      discordAvatarHash: user.avatarHash,
      characterName,
      className,
      levelText,
      availability,
      aboutYou,
    },
  });

  revalidatePath("/panel/postulacion");
  revalidatePath("/admin/recruitment");
}

const WAITLIST_DEFAULT_NOTE =
  "Agradecemos tu interés, sin embargo actualmente estarás en lista de espera hasta que haya cupos. Mientras tanto sé parte del servidor de Discord y participa del contenido mientras se liberan espacios.";

/**
 * Aprueba o pone en lista de espera una postulación. Requiere ser admin del
 * sitio o tener canManageRecruitment (Guild Leader / Vice Guild Leader /
 * Oficiales, según se configure en /admin/roles) — proxy.ts ya filtra el
 * acceso a la ruta, pero se revalida acá porque es una Server Function.
 */
export async function reviewApplication(
  applicationId: string,
  status: Extract<ApplicationStatus, "APPROVED" | "WAITLISTED">,
  formData: FormData
) {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageRecruitment) {
    throw new Error("Tu rol no tiene permiso para revisar postulaciones.");
  }

  const reviewer = session?.discordId
    ? await prisma.user.findUnique({ where: { discordId: session.discordId } })
    : null;

  const noteInput = String(formData.get("reviewNote") ?? "").trim();
  const reviewNote = noteInput || (status === "WAITLISTED" ? WAITLIST_DEFAULT_NOTE : "");

  await prisma.guildApplication.update({
    where: { id: applicationId },
    data: {
      status,
      reviewNote,
      reviewedByDiscordId: reviewer?.discordId ?? session?.username ?? "admin",
      reviewedByUsername: reviewer?.globalName ?? reviewer?.username ?? session?.username ?? "Admin",
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/admin/recruitment");
}
