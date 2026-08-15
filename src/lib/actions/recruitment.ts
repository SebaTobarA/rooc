"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { APPLICATION_SCREENSHOTS } from "@/lib/recruitment-screenshots";
import { publishApplication } from "@/lib/recruitment-discord";
import type { ApplicationStatus } from "@prisma/client";

/** Nivel base máximo del server. El job va aparte, hasta 70. */
const MAX_BASE_LEVEL = 99;
const MAX_JOB_LEVEL = 70;

/**
 * Normaliza el nivel escrito a mano. Acepta "99" o "99/70" (con o sin
 * espacios) y devuelve null si está fuera de rango — el formulario ya avisa
 * del tope, esto es la red de seguridad del servidor.
 */
function parseLevelText(raw: string): string | null {
  const match = raw.match(/^(\d{1,3})\s*(?:\/\s*(\d{1,3}))?$/);
  if (!match) return null;

  const base = Number(match[1]);
  if (base < 1 || base > MAX_BASE_LEVEL) return null;

  if (match[2] === undefined) return String(base);

  const job = Number(match[2]);
  if (job < 1 || job > MAX_JOB_LEVEL) return null;
  return `${base}/${job}`;
}

/**
 * Las capturas llegan como URL (ya subidas por /api/postulacion/upload), no
 * como archivo. Se acepta únicamente el host de Vercel Blob para que un envío
 * manipulado no pueda inyectar una imagen de otro origen — o peor, un
 * `javascript:`/`data:` — en el panel de reclutamiento.
 */
function isOwnBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

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
  const availability = String(formData.get("availability") ?? "").trim();
  const aboutYou = String(formData.get("aboutYou") ?? "").trim();

  if (!characterName || !availability) return;

  // La clase tiene que ser una de las del server: el <select> ya lo limita,
  // pero el FormData es del cliente y se puede falsear.
  if (!(JOB_ROLE_NAMES as readonly string[]).includes(className)) return;

  const levelText = parseLevelText(String(formData.get("levelText") ?? "").trim());
  if (levelText === null) return;

  // Las 8 capturas son obligatorias. Se aceptan solo URLs del Blob público
  // propio, para que nadie pueda guardar un enlace externo arbitrario que
  // después se renderice en el panel de los oficiales.
  const screenshots: Record<string, string> = {};
  for (const shot of APPLICATION_SCREENSHOTS) {
    const url = String(formData.get(shot.field) ?? "").trim();
    if (!isOwnBlobUrl(url)) return;
    screenshots[shot.field] = url;
  }

  const application = await prisma.guildApplication.create({
    data: {
      discordId: user.discordId,
      discordUsername: user.username,
      discordAvatarHash: user.avatarHash,
      characterName,
      className,
      levelText,
      availability,
      aboutYou,
      ...screenshots,
    },
  });

  // El aviso a Discord no puede tumbar el envío: si el bot está caído o le
  // falta permiso en el canal, la postulación ya quedó guardada y se revisa
  // igual desde /admin/recruitment.
  try {
    const messageId = await publishApplication(application);
    await prisma.guildApplication.update({
      where: { id: application.id },
      data: { discordMessageId: messageId },
    });
  } catch (err) {
    console.error("No se pudo publicar la postulación en Discord:", err);
  }

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
