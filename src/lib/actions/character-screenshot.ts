"use server";

/**
 * Análisis de la captura de personaje que pide /panel/ficha antes de enviar
 * una actualización. La imagen llega en el FormData, se lee con OCR en
 * memoria y se descarta: nunca se escribe en disco, en el blob ni en la base.
 */

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ScreenshotAnalysisError,
  createScreenshotProof,
  readCharacterScreenshot,
  sameName,
} from "@/lib/core-census/screenshot";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// El navegador la achica antes de mandarla (ver CharacterScreenshotField);
// esto es solo un tope por si llega una sin achicar.
const MAX_BYTES = 4 * 1024 * 1024;

export type ScreenshotAnalysis =
  | { ok: false; error: string }
  | {
      ok: true;
      job: string | null;
      jobAsShown: string | null;
      characterName: string | null;
      power: number | null;
      /** Lo que dice la ficha, para mostrar contra qué se comparó. */
      expectedJob: string | null;
      expectedName: string;
      jobMatches: boolean;
      nameMatches: boolean;
      /** Comprobante firmado que viaja con el formulario (ver submitMySheetUpdate). */
      proof: string;
    };

export async function analyzeMyCharacterScreenshot(formData: FormData): Promise<ScreenshotAnalysis> {
  const session = await getSession();
  if (!session?.discordId) return { ok: false, error: "Necesitas haber iniciado sesión con Discord." };
  const discordId = session.discordId;

  const sheet = await prisma.coreCharacterSheet.findUnique({ where: { discordId } });
  if (!sheet?.inCore) return { ok: false, error: "Solo los miembros [SD] Core pueden actualizar su ficha." };

  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Elige la captura de tu personaje." };
  const mediaType = ACCEPTED_TYPES.find((type) => type === file.type);
  if (!mediaType) return { ok: false, error: "La captura tiene que ser JPG, PNG o WEBP." };
  if (file.size > MAX_BYTES) return { ok: false, error: "La captura es demasiado pesada (máximo 4 MB)." };

  const registration = await prisma.memberRegistration.findUnique({
    where: { discordId },
    select: { nickname: true },
  });
  const expectedName = sheet.characterName || registration?.nickname || sheet.displayName || sheet.username;

  let reading;
  try {
    reading = await readCharacterScreenshot(Buffer.from(await file.arrayBuffer()), {
      name: expectedName,
      job: sheet.jobName,
    });
  } catch (err) {
    if (err instanceof ScreenshotAnalysisError) return { ok: false, error: err.message };
    console.error("analyzeMyCharacterScreenshot", err);
    return { ok: false, error: "No se pudo analizar la captura. Vuelve a intentar." };
  }

  if (!reading.isCharacterWindow) {
    return {
      ok: false,
      error: "Esa imagen no parece la ventana de tu personaje. Sube la pestaña básica de «Character / Personaje», donde se ven tu nombre, job y Power.",
    };
  }
  if (reading.power === null) {
    return { ok: false, error: "No se alcanza a leer tu Power en la captura. Prueba con una más nítida, sin recortar." };
  }

  return {
    ok: true,
    job: reading.job,
    jobAsShown: reading.jobAsShown,
    characterName: reading.characterName,
    power: reading.power,
    expectedJob: sheet.jobName,
    expectedName,
    jobMatches: Boolean(reading.job && sheet.jobName && reading.job === sheet.jobName),
    nameMatches: sameName(reading.characterName, expectedName),
    proof: createScreenshotProof({
      discordId,
      job: reading.job ?? reading.jobAsShown,
      characterName: reading.characterName,
      power: reading.power,
    }),
  };
}
