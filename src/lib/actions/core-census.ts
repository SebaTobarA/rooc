"use server";

/**
 * Server actions de Evaluación de CORE (/admin/evaluacion-core): revisión de
 * equipo en la hoja de vida de cada jugador, reporte post evento y la lista
 * de voz que toma Boo.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getCoreGuildRoster } from "@/lib/core-guild/sync";
import { findMembersInEventVoice } from "@/lib/core-census/voice";
import { SHEET_REQUIREMENTS, pickSheetValues, type RequirementOverrides } from "@/lib/core-census/requirements";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { readSnapshot } from "@/lib/party/template-snapshot";
import { EVALUATION_START } from "@/lib/core-census/tier";

const EVALUATION_PATH = "/admin/evaluacion-core";

// /admin ya está detrás del gate de src/proxy.ts; se revalida acá igual
// porque de esto depende que alguien siga o no en el core.
async function requireAdmin(): Promise<string | null> {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error("Solo un admin puede modificar la Evaluación de CORE.");
  if (!session.discordId) return session.username ?? null;
  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
  return user?.globalName ?? user?.username ?? null;
}

// ---------------------------------------------------------------------------
// Revisión de equipo
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

// Los aspectos de la ficha, tal como llegan de un formulario (ver SheetFields).
const sheetValuesShape = {
  power: optionalInt(2_000_000_000),
  refine: optionalInt(99),
  medals: optionalInt(100_000_000),
  mr: optionalInt(999),
  feathers: optionalInt(99),
  enchants: optionalInt(999),
  cardsPvp: optionalBoolean,
  s2Orange: optionalBoolean,
  skillTreePvp: optionalBoolean,
};

function readSheetValues(formData: FormData) {
  return Object.fromEntries(SHEET_REQUIREMENTS.map((requirement) => [requirement.field, formData.get(requirement.field)]));
}

const sheetSchema = z.object({
  characterName: z.string().trim().max(60),
  ...sheetValuesShape,
  notes: z.string().trim().max(1000),
  comfortableWithJob: optionalBoolean,
  // Vacío o un job que no existe = sin definir.
  desiredJob: z.preprocess(
    (value) => ((JOB_ROLE_NAMES as readonly unknown[]).includes(value) ? value : null),
    z.string().nullable()
  ),
});

/**
 * Guarda la revisión de equipo de un jugador. La ficha queda con los valores
 * nuevos y, si cambió algo de lo evaluado, se agrega una foto al historial de
 * revisiones: así se ve cómo fue avanzando durante su permanencia.
 */
export async function saveCharacterSheet(discordId: string, formData: FormData): Promise<void> {
  const updatedByUsername = await requireAdmin();

  const data = sheetSchema.parse({
    characterName: formData.get("characterName") ?? "",
    ...readSheetValues(formData),
    notes: formData.get("notes") ?? "",
    comfortableWithJob: formData.get("comfortableWithJob"),
    desiredJob: formData.get("desiredJob"),
  });

  // El job deseado solo se guarda si dijo que no está cómodo con el actual.
  const { characterName, comfortableWithJob, desiredJob, ...evaluation } = data;
  const profile = {
    characterName,
    comfortableWithJob,
    desiredJob: comfortableWithJob === false ? desiredJob : null,
  };
  const previous = await prisma.coreCharacterSheet.findUnique({ where: { discordId } });
  const evaluationChanged =
    !previous?.reviewedAt ||
    previous.notes !== evaluation.notes ||
    SHEET_REQUIREMENTS.some((requirement) => previous[requirement.field] !== evaluation[requirement.field]);

  const reviewedAt = new Date();
  await prisma.$transaction([
    prisma.coreCharacterSheet.upsert({
      where: { discordId },
      create: { discordId, ...profile, ...evaluation, reviewedAt, updatedByUsername },
      update: { ...profile, ...(evaluationChanged ? { ...evaluation, reviewedAt, updatedByUsername } : {}) },
    }),
    ...(evaluationChanged
      ? [
          prisma.coreSheetRevision.create({
            data: { discordId, ...evaluation, reviewedByUsername: updatedByUsername },
          }),
        ]
      : []),
  ]);

  revalidatePath(EVALUATION_PATH);
  redirect(`${EVALUATION_PATH}/jugador/${discordId}?guardado=1`);
}

// ---------------------------------------------------------------------------
// Configuración de requisitos
// ---------------------------------------------------------------------------

/** Guarda los mínimos de cada aspecto de la ficha (/admin/requisitos-core). */
export async function saveRequirementSettings(formData: FormData): Promise<void> {
  const updatedByUsername = await requireAdmin();

  const mins: RequirementOverrides = {};
  for (const requirement of SHEET_REQUIREMENTS) {
    if (requirement.kind === "number") {
      const value = Math.floor(Number(formData.get(`min_${requirement.field}`) ?? 0));
      mins[requirement.field] = Number.isFinite(value) && value > 0 ? Math.min(value, 2_000_000_000) : 0;
    } else {
      mins[requirement.field] = formData.get(`required_${requirement.field}`) === "on";
    }
  }

  const existing = await prisma.coreRequirementSettings.findFirst();
  if (existing) {
    await prisma.coreRequirementSettings.update({ where: { id: existing.id }, data: { mins, updatedByUsername } });
  } else {
    await prisma.coreRequirementSettings.create({ data: { mins, updatedByUsername } });
  }

  revalidatePath(EVALUATION_PATH);
  revalidatePath("/panel");
  redirect("/admin/requisitos-core?guardado=1");
}

// ---------------------------------------------------------------------------
// Actualización reportada por el jugador y su validación
// ---------------------------------------------------------------------------

const submissionSchema = z.object({ ...sheetValuesShape, note: z.string().trim().max(300) });

/**
 * El propio jugador reporta los datos de su personaje desde /panel/ficha. No
 * toca su ficha: queda PENDING hasta que un moderador la valide. Si ya tenía
 * una pendiente, se reemplaza.
 */
export async function submitMySheetUpdate(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session?.discordId) throw new Error("Necesitas haber iniciado sesión con Discord.");
  const discordId = session.discordId;

  const sheet = await prisma.coreCharacterSheet.findUnique({ where: { discordId } });
  if (!sheet?.inCore) throw new Error("Solo los miembros [SD] Core pueden actualizar su ficha.");

  const data = submissionSchema.parse({ ...readSheetValues(formData), note: formData.get("note") ?? "" });

  const pending = await prisma.coreSheetSubmission.findFirst({ where: { discordId, status: "PENDING" } });
  if (pending) {
    await prisma.coreSheetSubmission.update({ where: { id: pending.id }, data: { ...data, createdAt: new Date() } });
  } else {
    await prisma.coreSheetSubmission.create({ data: { discordId, ...data } });
  }

  revalidatePath("/panel");
  revalidatePath(EVALUATION_PATH);
  redirect("/panel/ficha?enviado=1");
}

/**
 * Un moderador valida lo que reportó el jugador. Al aceptar, los valores
 * reportados pasan a la ficha y queda una revisión marcada como reportada por
 * el jugador; al rechazar, la ficha no cambia. En los dos casos el reporte
 * queda en el historial con quién lo revisó.
 */
export async function reviewSheetSubmission(
  submissionId: string,
  decision: "accept" | "reject",
  formData: FormData
): Promise<void> {
  const reviewedByUsername = await requireAdmin();

  const submission = await prisma.coreSheetSubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.status !== "PENDING") {
    throw new Error("Esta actualización ya fue revisada.");
  }

  const reviewNote = String(formData.get("reviewNote") ?? "").trim().slice(0, 300);
  const reviewedAt = new Date();
  const review = { reviewNote, reviewedByUsername, reviewedAt };
  const { discordId } = submission;

  if (decision === "accept") {
    const values = pickSheetValues(submission);
    await prisma.$transaction([
      prisma.coreCharacterSheet.update({
        where: { discordId },
        data: { ...values, reviewedAt, updatedByUsername: reviewedByUsername },
      }),
      prisma.coreSheetRevision.create({
        data: { discordId, ...values, notes: submission.note, reviewedByUsername, reportedByPlayer: true },
      }),
      prisma.coreSheetSubmission.update({ where: { id: submissionId }, data: { status: "ACCEPTED", ...review } }),
    ]);
  } else {
    await prisma.coreSheetSubmission.update({ where: { id: submissionId }, data: { status: "REJECTED", ...review } });
  }

  revalidatePath(EVALUATION_PATH);
  revalidatePath("/panel");
  redirect(`${EVALUATION_PATH}/jugador/${discordId}?validado=${decision === "accept" ? "aceptada" : "rechazada"}`);
}

// ---------------------------------------------------------------------------
// Reporte post evento
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
 * Guarda el reporte post evento de todos los miembros y lo da por cerrado: a
 * partir de acá cuenta para el tier del mes y aparece en la hoja de vida de
 * cada uno. Se puede volver a guardar para corregir. La respuesta a la
 * encuesta de asistencia no viene del formulario: se copia de EventSignup.
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

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, startsAt: true, signups: { select: { discordId: true, status: true } } },
  });
  if (!event) return { error: "Este evento ya no existe." };
  if (event.startsAt < EVALUATION_START) return { error: "Este evento es anterior al inicio de la evaluación." };
  const surveyById = new Map(event.signups.map((signup) => [signup.discordId, signup.status]));

  // Job y party de cada jugador en este evento, para medir rendimiento más
  // adelante: del Party Builder si se armó una plantilla para el evento (la
  // última guardada), y si no, el job de la ficha.
  const [sheets, template] = await Promise.all([
    prisma.coreCharacterSheet.findMany({
      where: { discordId: { in: parsed.data.map((row) => row.discordId) } },
      select: { discordId: true, jobName: true },
    }),
    prisma.partyTemplate.findFirst({ where: { eventId }, orderBy: { updatedAt: "desc" } }),
  ]);
  const sheetJobById = new Map(sheets.map((sheet) => [sheet.discordId, sheet.jobName]));
  const snapshot = template ? readSnapshot(template.data) : null;
  const partyNameById = new Map(snapshot?.parties.map((party) => [party.id, party.name]) ?? []);
  const builderById = new Map(snapshot?.players.map((player) => [player.id, player]) ?? []);

  await prisma.$transaction([
    ...parsed.data.map((row) => {
      const builder = builderById.get(row.discordId);
      // Sin rendimiento si no jugó, y sin justificación si no hubo falta.
      const data = {
        jobName: row.inGame ? builder?.clase || sheetJobById.get(row.discordId) || null : null,
        partyName: row.inGame && builder?.partyId ? (partyNameById.get(builder.partyId) ?? null) : null,
        displayName: row.displayName,
        inGame: row.inGame,
        inDiscord: row.inDiscord,
        surveyStatus: surveyById.get(row.discordId) ?? null,
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

  revalidatePath(EVALUATION_PATH);
  return {};
}

/**
 * Boo revisa, uno por uno, quiénes del rol Core están ahora mismo en los
 * canales de voz del evento y les marca "Discord". Solo suma: quien ya quedó
 * marcado en una pasada anterior no se desmarca por haberse desconectado
 * después. Se guarda al toque (no espera a "Guardar reporte") para poder tomar
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
