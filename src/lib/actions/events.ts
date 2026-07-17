"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { renderAndPublishEmbed } from "@/lib/events";

// El input datetime-local no lleva huso horario — se interpreta siempre
// como hora de Argentina (fija en UTC-3, sin horario de verano), que es
// también el huso con el que se formatea el embed en discord-event-embed.ts.
// Sin este offset explícito, el parseo dependería del timezone del runtime
// del servidor (Vercel corre en UTC) en vez de la hora real del evento.
const argentinaDateTime = z
  .string()
  .min(1, "La fecha y hora son obligatorias")
  .transform((value) => new Date(`${value}:00-03:00`));

const eventSchema = z
  .object({
    title: z.string().min(1, "El título es obligatorio"),
    description: z.string().default(""),
    templateId: z.string().min(1, "Elegí un template"),
    startsAt: argentinaDateTime,
    endsAt: argentinaDateTime,
    signupsCloseAt: argentinaDateTime,
  })
  .refine((data) => data.endsAt >= data.startsAt, {
    message: "El fin del evento no puede ser antes del inicio",
    path: ["endsAt"],
  })
  .refine((data) => data.signupsCloseAt <= data.startsAt, {
    message: "El cierre de inscripciones no puede ser después de que arranca el evento",
    path: ["signupsCloseAt"],
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
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    signupsCloseAt: formData.get("signupsCloseAt"),
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

export async function deleteEvent(id: string) {
  const existing = await prisma.event.findUniqueOrThrow({ where: { id } });
  if (existing.status !== "DRAFT") {
    throw new Error("Solo se pueden borrar eventos que todavía no se enviaron a Discord.");
  }
  await prisma.event.delete({ where: { id } });
  revalidateEventPaths();
  redirect("/panel/eventos");
}
