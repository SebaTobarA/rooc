"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { APPLICATION_SCREENSHOTS, CANDIDATE_SCREENSHOTS } from "@/lib/recruitment-screenshots";
import { SHEET_REQUIREMENTS } from "@/lib/core-census/requirements";
import { getGuildMember } from "@/lib/discord-bot";
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

// ---------------------------------------------------------------------------
// Ficha de candidato (/admin/recruitment/[id])
// ---------------------------------------------------------------------------

async function requireRecruiter(): Promise<string> {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageRecruitment) {
    throw new Error("Tu rol no tiene permiso para gestionar reclutamiento.");
  }
  const user = session?.discordId
    ? await prisma.user.findUnique({ where: { discordId: session.discordId } })
    : null;
  return user?.globalName ?? user?.username ?? session?.username ?? "Admin";
}

function optionalInt(value: FormDataEntryValue | null, max: number): number | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const number = Math.floor(Number(text));
  return Number.isFinite(number) && number >= 0 ? Math.min(number, max) : null;
}

function optionalBoolean(value: FormDataEntryValue | null): boolean | null {
  return value === "yes" ? true : value === "no" ? false : null;
}

/**
 * Crea a mano la ficha de un candidato que no postuló desde el panel (lo
 * eligen de los miembros del server de Discord). Si ya tiene una postulación,
 * lleva a esa ficha en vez de duplicarla.
 */
export async function createCandidate(formData: FormData): Promise<void> {
  const createdByUsername = await requireRecruiter();
  const discordId = String(formData.get("discordId") ?? "").trim();
  if (!discordId) throw new Error("Elige al candidato de la lista de miembros del server.");

  const existing = await prisma.guildApplication.findUnique({ where: { discordId }, select: { id: true } });
  if (existing) redirect(`/admin/recruitment/${existing.id}`);

  const member = await getGuildMember(discordId);
  if (!member) throw new Error("Esa persona ya no está en el server de Discord.");

  const className = String(formData.get("className") ?? "").trim();
  const application = await prisma.guildApplication.create({
    data: {
      discordId,
      discordUsername: member.user.username,
      discordAvatarHash: member.user.avatar,
      characterName:
        String(formData.get("characterName") ?? "").trim() ||
        member.nick ||
        member.user.global_name ||
        member.user.username,
      className: (JOB_ROLE_NAMES as readonly string[]).includes(className) ? className : "",
      availability: "",
      createdByUsername,
    },
  });

  revalidatePath("/admin/recruitment");
  redirect(`/admin/recruitment/${application.id}`);
}

/** Guarda la ficha del candidato: datos, valores del personaje, capturas y notas. */
export async function saveCandidateSheet(applicationId: string, formData: FormData): Promise<void> {
  await requireRecruiter();

  const className = String(formData.get("className") ?? "").trim();
  const classFlexible = optionalBoolean(formData.get("classFlexible"));
  const flexibleJobs = formData
    .getAll("flexibleJobs")
    .map(String)
    .filter((job) => (JOB_ROLE_NAMES as readonly string[]).includes(job));

  const values: Record<string, number | boolean | null> = {};
  for (const requirement of SHEET_REQUIREMENTS) {
    values[requirement.field] =
      requirement.kind === "number"
        ? optionalInt(formData.get(requirement.field), 2_000_000_000)
        : optionalBoolean(formData.get(requirement.field));
  }

  // Igual que en la postulación: solo URLs del Blob propio, o vacío.
  const shots: Record<string, string> = {};
  for (const shot of CANDIDATE_SCREENSHOTS) {
    const url = String(formData.get(shot.field) ?? "").trim();
    shots[shot.field] = url && isOwnBlobUrl(url) ? url : "";
  }

  await prisma.guildApplication.update({
    where: { id: applicationId },
    data: {
      characterName: String(formData.get("characterName") ?? "").trim().slice(0, 60) || undefined,
      gameId: String(formData.get("gameId") ?? "").trim().slice(0, 40),
      className: (JOB_ROLE_NAMES as readonly string[]).includes(className) ? className : undefined,
      classFlexible,
      flexibleJobs: classFlexible ? flexibleJobs : [],
      recruiterComments: String(formData.get("recruiterComments") ?? "").trim().slice(0, 2000),
      internalNotes: String(formData.get("internalNotes") ?? "").trim().slice(0, 2000),
      ...values,
      ...shots,
    },
  });

  revalidatePath("/admin/recruitment");
  redirect(`/admin/recruitment/${applicationId}?guardado=1`);
}

/**
 * Decisión sobre la ficha: aprobar, rechazar o lista de espera, con
 * observaciones. Aprobar desde acá no asigna rol de guild en Discord: eso lo
 * sigue haciendo el botón del aviso en el canal de reclutamiento, que pregunta
 * a qué guild entra.
 */
export async function reviewCandidate(
  applicationId: string,
  status: Extract<ApplicationStatus, "APPROVED" | "REJECTED" | "WAITLISTED" | "PENDING">,
  formData: FormData
): Promise<void> {
  const reviewerName = await requireRecruiter();
  const session = await getSession();
  const noteInput = String(formData.get("reviewNote") ?? "").trim().slice(0, 1000);
  const reviewNote = noteInput || (status === "WAITLISTED" ? WAITLIST_DEFAULT_NOTE : "");

  await prisma.guildApplication.update({
    where: { id: applicationId },
    data:
      status === "PENDING"
        ? { status, reviewNote: "", reviewedByDiscordId: null, reviewedByUsername: null, reviewedAt: null }
        : {
            status,
            reviewNote,
            reviewedByDiscordId: session?.discordId ?? session?.username ?? "admin",
            reviewedByUsername: reviewerName,
            reviewedAt: new Date(),
          },
  });

  revalidatePath("/admin/recruitment");
  revalidatePath("/panel/postulacion");
  redirect(`/admin/recruitment/${applicationId}?revisada=1`);
}
