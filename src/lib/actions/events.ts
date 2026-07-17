"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { renderAndPublishEmbed } from "@/lib/events";

// Fecha y hora llegan como dos inputs nativos separados (type="date" +
// type="time", cada uno con su propio selector). Se combinan acá y se les
// agrega el offset de Argentina (fija en UTC-3, sin horario de verano) —
// el mismo huso con el que se formatea el embed en discord-event-embed.ts.
// Sin este offset explícito, el parseo dependería del timezone del runtime
// del servidor (Vercel corre en UTC) en vez de la hora real del evento.
const eventSchema = z
  .object({
    title: z.string().min(1, "El título es obligatorio"),
    description: z.string().default(""),
    templateId: z.string().min(1, "Elegí un template"),
    startsAtDate: z.string().min(1, "La fecha de inicio es obligatoria"),
    startsAtTime: z.string().min(1, "La hora de inicio es obligatoria"),
    endsAtDate: z.string().min(1, "La fecha de fin es obligatoria"),
    endsAtTime: z.string().min(1, "La hora de fin es obligatoria"),
  })
  .transform((data) => {
    const startsAt = new Date(`${data.startsAtDate}T${data.startsAtTime}:00-03:00`);
    const endsAt = new Date(`${data.endsAtDate}T${data.endsAtTime}:00-03:00`);
    return {
      title: data.title,
      description: data.description,
      templateId: data.templateId,
      startsAt,
      endsAt,
      // El cierre de inscripciones es el mismo fin del evento: el mensaje
      // en Discord queda visible hasta que se borre, así que no hace
      // falta un campo aparte para "cuándo deja de existir la encuesta".
      signupsCloseAt: endsAt,
    };
  })
  .refine((data) => data.endsAt >= data.startsAt, {
    message: "El fin del evento no puede ser antes del inicio",
    path: ["endsAtDate"],
  });

function revalidateEventPaths(id?: string) {
  revalidatePath("/panel/eventos");
  if (id) revalidatePath(`/panel/eventos/${id}`);
}

export async function createEvent(formData: FormData) {
  const data = eventSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    templateId: formData.get("templateId"),
    startsAtDate: formData.get("startsAtDate"),
    startsAtTime: formData.get("startsAtTime"),
    endsAtDate: formData.get("endsAtDate"),
    endsAtTime: formData.get("endsAtTime"),
  });

  const session = await getSession();
  const user = session?.discordId
    ? await prisma.user.findUnique({ where: { discordId: session.discordId } })
    : null;
  if (!user) throw new Error("Necesitás haber iniciado sesión con Discord.");

  const template = await prisma.eventTemplate.findUniqueOrThrow({ where: { id: data.templateId } });

  const event = await prisma.event.create({
    data: { ...data, category: template.category, createdById: user.id },
  });

  revalidateEventPaths(event.id);
  redirect(`/panel/eventos/${event.id}`);
}

export async function sendEvent(id: string) {
  await renderAndPublishEmbed(id);
  revalidateEventPaths(id);
}

/**
 * Lectura fresca de los signups de un evento — usada por el Party Builder
 * para "Actualizar inscriptos" sin recargar la página. Requiere el mismo
 * permiso que gestionar parties, aunque sea de solo lectura.
 */
export async function getEventSignups(eventId: string) {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para ver inscripciones de eventos.");
  }
  return prisma.eventSignup.findMany({ where: { eventId } });
}

export async function deleteEvent(id: string) {
  const existing = await prisma.event.findUniqueOrThrow({ where: { id } });
  if (existing.status !== "DRAFT") {
    throw new Error("Solo se pueden borrar eventos que todavía no se enviaron a Discord.");
  }
  await prisma.event.delete({ where: { id } });
  revalidateEventPaths();
  redirect("/panel/eventos");
}
