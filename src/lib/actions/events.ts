"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EventCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { renderAndPublishEmbed } from "@/lib/events";

const eventSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().default(""),
  category: z.nativeEnum(EventCategory),
  // El input datetime-local no lleva huso horario — se interpreta siempre
  // como hora de Argentina (fija en UTC-3, sin horario de verano), que es
  // también el huso con el que se formatea el embed en discord-event-embed.ts.
  // Sin este offset explícito, el parseo dependería del timezone del
  // runtime del servidor (Vercel corre en UTC) en vez de la hora real del
  // evento.
  startsAt: z
    .string()
    .min(1, "La fecha y hora son obligatorias")
    .transform((value) => new Date(`${value}:00-03:00`)),
});

function revalidateEventPaths(id?: string) {
  revalidatePath("/admin/events");
  if (id) revalidatePath(`/admin/events/${id}`);
}

export async function createEvent(formData: FormData) {
  const data = eventSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    startsAt: formData.get("startsAt"),
  });

  const session = await getSession();
  const user = session?.discordId
    ? await prisma.user.findUnique({ where: { discordId: session.discordId } })
    : null;
  if (!user) throw new Error("Necesitás haber iniciado sesión con Discord.");

  const event = await prisma.event.create({ data: { ...data, createdById: user.id } });

  revalidateEventPaths(event.id);
  redirect(`/admin/events/${event.id}`);
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
  redirect("/admin/events");
}
