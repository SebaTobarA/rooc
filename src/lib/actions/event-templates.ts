"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EventAttendanceMode, EventCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const templateSchema = z.object({
  title: z.string().min(1, "El nombre es obligatorio"),
  category: z.nativeEnum(EventCategory),
  icon: z
    .string()
    .max(8)
    .optional()
    .transform((value) => value || null),
  embedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "El color tiene que ser un hex válido, ej: #6fe0f5"),
  attendanceMode: z.nativeEnum(EventAttendanceMode),
});

function parseTemplateForm(formData: FormData) {
  return templateSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    icon: formData.get("icon") ?? "",
    embedColor: formData.get("embedColor"),
    attendanceMode: formData.get("attendanceMode") ?? "CONFIRM",
  });
}

export async function createEventTemplate(formData: FormData) {
  const data = parseTemplateForm(formData);

  const session = await getSession();
  const user = session?.discordId
    ? await prisma.user.findUnique({ where: { discordId: session.discordId } })
    : null;
  if (!user) throw new Error("Necesitas haber iniciado sesión con Discord.");

  await prisma.eventTemplate.create({ data: { ...data, createdById: user.id } });
  revalidatePath("/panel/eventos");
}

export async function updateEventTemplate(id: string, formData: FormData) {
  const data = parseTemplateForm(formData);
  await prisma.eventTemplate.update({ where: { id }, data });
  revalidatePath("/panel/eventos");
}

/**
 * Borra una plantilla, o la archiva si ya tiene eventos creados (no se puede
 * borrar sin perder esos eventos y sus asistencias). Devuelve el resultado en
 * vez de lanzar: en producción Next oculta el mensaje de los errores de las
 * server actions y el panel mostraba un error genérico.
 */
export async function deleteEventTemplate(id: string): Promise<{ archived?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Necesitas haber iniciado sesión." };

  const events = await prisma.event.count({ where: { templateId: id } });
  if (events > 0) {
    await prisma.eventTemplate.update({ where: { id }, data: { archivedAt: new Date() } });
  } else {
    await prisma.eventTemplate.delete({ where: { id } });
  }
  revalidatePath("/panel/eventos");
  return { archived: events > 0 };
}
