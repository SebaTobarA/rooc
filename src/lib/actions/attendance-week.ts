"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { chileWallTimeToUtc, addDaysToDateString } from "@/lib/chile-time";
import { renderAndPublishEmbed } from "@/lib/events";

const schema = z.object({
  guildLeagueTemplateId: z.string().min(1, "Elige el template de Guild League"),
  emperiumTemplateId: z.string().min(1, "Elige el template de War of Emperium"),
  tuesdayDate: z.string().min(1, "Elige la fecha del martes de esa semana"),
  startTime: z.string().min(1, "Falta la hora de inicio"),
  endTime: z.string().min(1, "Falta la hora de fin"),
  channelId: z.string().min(1, "Elige a qué canal publicarlo"),
});

/**
 * Crea los 3 eventos fijos de la semana (Martes y Jueves Guild League +
 * Domingo War of Emperium) agrupados bajo un mismo weekGroupId, y los
 * publica juntos como un solo mensaje combinado en Discord — ver
 * renderAndPublishEmbed/buildWeeklyAttendanceEmbed. El cierre de
 * inscripciones de cada día queda fijo a las 18:00 hora de Chile de ese
 * mismo día, tal como se definió con la guild.
 */
export async function createAttendanceWeek(formData: FormData) {
  const data = schema.parse({
    guildLeagueTemplateId: formData.get("guildLeagueTemplateId"),
    emperiumTemplateId: formData.get("emperiumTemplateId"),
    tuesdayDate: formData.get("tuesdayDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    channelId: formData.get("channelId"),
  });

  const session = await getSession();
  const user = session?.discordId
    ? await prisma.user.findUnique({ where: { discordId: session.discordId } })
    : null;
  if (!user) throw new Error("Necesitas haber iniciado sesión con Discord.");

  const [guildLeagueTemplate, emperiumTemplate] = await Promise.all([
    prisma.eventTemplate.findUniqueOrThrow({ where: { id: data.guildLeagueTemplateId } }),
    prisma.eventTemplate.findUniqueOrThrow({ where: { id: data.emperiumTemplateId } }),
  ]);

  if (guildLeagueTemplate.attendanceMode !== "DECLINE" || emperiumTemplate.attendanceMode !== "DECLINE") {
    throw new Error(
      'Los dos templates elegidos tienen que estar en modo "Marcar inasistencia" para armar la semana combinada.'
    );
  }

  const [startHour, startMinute] = data.startTime.split(":").map(Number);
  const [endHour, endMinute] = data.endTime.split(":").map(Number);

  const dayPlan = [
    { offset: 0, template: guildLeagueTemplate, label: "Martes" },
    { offset: 2, template: guildLeagueTemplate, label: "Jueves" },
    { offset: 5, template: emperiumTemplate, label: "Domingo" },
  ];

  const weekGroupId = randomUUID();
  const createdEventIds: string[] = [];

  for (const day of dayPlan) {
    const { year, month, day: d } = addDaysToDateString(data.tuesdayDate, day.offset);
    const startsAt = chileWallTimeToUtc(year, month, d, startHour, startMinute);
    const endsAt = chileWallTimeToUtc(year, month, d, endHour, endMinute);
    const signupsCloseAt = chileWallTimeToUtc(year, month, d, 18, 0);

    const event = await prisma.event.create({
      data: {
        title: `${day.template.title} — ${day.label}`,
        category: day.template.category,
        attendanceMode: day.template.attendanceMode,
        templateId: day.template.id,
        startsAt,
        endsAt,
        signupsCloseAt,
        weekGroupId,
        createdById: user.id,
      },
    });
    createdEventIds.push(event.id);
  }

  await renderAndPublishEmbed(createdEventIds[0], data.channelId);

  revalidatePath("/panel/eventos");
  redirect("/panel/eventos");
}
