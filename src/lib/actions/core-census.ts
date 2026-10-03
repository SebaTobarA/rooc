"use server";

/**
 * Server actions del censo Core (/admin/core-guild/censo): ficha de equipo de
 * cada miembro, carga de la participación por evento y la lista de voz que
 * toma Boo.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getCoreGuildRoster } from "@/lib/core-guild/sync";
import { findMembersInEventVoice } from "@/lib/core-census/voice";

const CENSUS_PATH = "/admin/core-guild/censo";

// /admin ya está detrás del gate de src/proxy.ts; se revalida acá igual
// porque de esto depende que alguien siga o no en el core.
async function requireAdmin(): Promise<string | null> {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error("Solo un admin puede modificar el censo Core.");
  if (!session.discordId) return session.username ?? null;
  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
  return user?.globalName ?? user?.username ?? null;
}

// ---------------------------------------------------------------------------
// Ficha de equipo
// ---------------------------------------------------------------------------

// Campo numérico opcional de un formulario: vacío = sin evaluar (null).
const optionalInt = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : null),
    z.number().int().min(0).max(max).nullable()
  );

// Select de tres estados: "" sin evaluar, "yes" cumple, "no" no cumple.
const optionalBoolean = z.preprocess(
  (value) => (value === "yes" ? true : value === "no" ? false : null),
  z.boolean().nullable()
);

const sheetSchema = z.object({
  characterName: z.string().trim().max(60),
  refine: optionalInt(99),
  medals: optionalInt(100_000_000),
  mr: optionalInt(999),
  feathers: optionalInt(99),
  enchants: optionalInt(999),
  cardsPvp: optionalBoolean,
  s2Orange: optionalBoolean,
  skillTreePvp: optionalBoolean,
  notes: z.string().trim().max(1000),
});

export async function saveCharacterSheet(discordId: string, formData: FormData): Promise<void> {
  const updatedByUsername = await requireAdmin();

  const data = sheetSchema.parse({
    characterName: formData.get("characterName") ?? "",
    refine: formData.get("refine"),
    medals: formData.get("medals"),
    mr: formData.get("mr"),
    feathers: formData.get("feathers"),
    enchants: formData.get("enchants"),
    cardsPvp: formData.get("cardsPvp"),
    s2Orange: formData.get("s2Orange"),
    skillTreePvp: formData.get("skillTreePvp"),
    notes: formData.get("notes") ?? "",
  });

  await prisma.coreCharacterSheet.upsert({
    where: { discordId },
    create: { discordId, ...data, updatedByUsername },
    update: { ...data, updatedByUsername },
  });

  revalidatePath(CENSUS_PATH);
  redirect(`${CENSUS_PATH}/miembro/${discordId}?guardado=1`);
}

// ---------------------------------------------------------------------------
// Participación por evento
// ---------------------------------------------------------------------------

const stat = z.number().int().min(0).max(10_000_000).nullable();

const censusRowSchema = z.object({
  discordId: z.string().min(1),
  displayName: z.string().min(1).max(100),
  inGame: z.boolean(),
  inDiscord: z.boolean(),
  points: stat,
  kills: stat,
  deaths: stat,
  assists: stat,
  justified: z.boolean(),
  note: z.string().trim().max(300),
});

export type CensusRowInput = z.infer<typeof censusRowSchema>;

/**
 * Guarda la participación de todos los miembros en un evento y lo da por
 * censado: a partir de acá cuenta para el tier del mes. Se puede volver a
 * guardar para corregir.
 */
export async function saveEventCensus(eventId: string, rows: CensusRowInput[]): Promise<{ error?: string }> {
  await requireAdmin();

  const parsed = z.array(censusRowSchema).max(500).safeParse(rows);
  if (!parsed.success) return { error: "Hay valores inválidos en la tabla. Revisa puntos y KDA." };

  for (const row of parsed.data) {
    const attended = row.inGame && row.inDiscord;
    if (row.justified && !attended && !row.note) {
      return { error: `Falta la nota que justifica la ausencia de ${row.displayName}.` };
    }
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return { error: "Este evento ya no existe." };

  await prisma.$transaction([
    ...parsed.data.map((row) => {
      // Sin rendimiento si no jugó, y sin justificación si no hubo falta.
      const data = {
        displayName: row.displayName,
        inGame: row.inGame,
        inDiscord: row.inDiscord,
        points: row.inGame ? row.points : null,
        kills: row.inGame ? row.kills : null,
        deaths: row.inGame ? row.deaths : null,
        assists: row.inGame ? row.assists : null,
        justified: row.justified && !(row.inGame && row.inDiscord),
        note: row.note,
      };
      return prisma.coreEventRecord.upsert({
        where: { eventId_discordId: { eventId, discordId: row.discordId } },
        create: { eventId, discordId: row.discordId, ...data },
        update: data,
      });
    }),
    prisma.event.update({ where: { id: eventId }, data: { coreCensusAt: new Date() } }),
  ]);

  revalidatePath(CENSUS_PATH);
  return {};
}

/**
 * Boo revisa, uno por uno, quiénes del rol Core están ahora mismo en los
 * canales de voz del evento y les marca "Discord". Solo suma: quien ya quedó
 * marcado en una pasada anterior no se desmarca por haberse desconectado
 * después. Se guarda al toque (no espera a "Guardar censo") para poder tomar
 * lista durante el evento y cargar el resto cuando termina.
 */
export async function takeVoiceAttendance(
  eventId: string
): Promise<{ presentIds?: string[]; checked?: number; error?: string }> {
  await requireAdmin();

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { category: true } });
    if (!event) return { error: "Este evento ya no existe." };

    const roster = await getCoreGuildRoster();
    const presentIds = await findMembersInEventVoice(
      event.category,
      roster.map((entry) => entry.discordId)
    );

    const present = new Set(presentIds);
    const voiceSeenAt = new Date();
    await prisma.$transaction(
      roster
        .filter((entry) => present.has(entry.discordId))
        .map((entry) =>
          prisma.coreEventRecord.upsert({
            where: { eventId_discordId: { eventId, discordId: entry.discordId } },
            create: {
              eventId,
              discordId: entry.discordId,
              displayName: entry.nick ?? entry.globalName ?? entry.username,
              inDiscord: true,
              voiceSeenAt,
            },
            update: { inDiscord: true, voiceSeenAt },
          })
        )
    );

    return { presentIds, checked: roster.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo tomar la lista de voz." };
  }
}
