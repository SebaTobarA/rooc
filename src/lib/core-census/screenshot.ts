/**
 * Lectura de la captura de la ventana "Character" del juego que el jugador
 * sube al actualizar su ficha Core (ver analyzeMyCharacterScreenshot). Se lee
 * con OCR (Tesseract.js) en el servidor, sin servicios externos de pago, y la
 * imagen se descarta: no se guarda en ningún lado, solo lo que se leyó.
 *
 * El OCR no "entiende" la imagen, así que en vez de adivinar dónde está cada
 * dato se busca lo que debería estar: el nombre y el job de la ficha, y el
 * número que acompaña a "Power"/"Poder". El juego puede estar en español,
 * portugués o inglés.
 */

import "server-only";
import os from "node:os";
import { createHmac, timingSafeEqual } from "node:crypto";
import sharp, { type OutputInfo, type Sharp } from "sharp";
import { createWorker, type Word } from "tesseract.js";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";

export interface ScreenshotReading {
  isCharacterWindow: boolean;
  characterName: string | null;
  /** Job llevado al nombre de rol del server (JOB_ROLE_NAMES). */
  job: string | null;
  /** El job tal como se leyó en la captura. */
  jobAsShown: string | null;
  power: number | null;
}

export class ScreenshotAnalysisError extends Error {}

// Cómo puede aparecer cada job en la captura, además de su nombre de rol.
// El cliente muestra los jobs en inglés también en español y portugués; si
// algún idioma los traduce, se agregan acá (en minúsculas, sin tildes).
const JOB_ALIASES: Partial<Record<(typeof JOB_ROLE_NAMES)[number], string[]>> = {
  Paladín: ["paladin", "paladino"],
};

// Palabras de la ventana de personaje en los tres idiomas: si no aparece
// ninguna, la imagen no es esa ventana.
const WINDOW_WORDS = ["character", "personaje", "personagem", "job", "base", "classe", "clase"];
const POWER_WORDS = /^(power|poder)$/i;

// Las capturas se agrandan a este ancho antes de leerlas: el texto del juego
// es chico y Tesseract lee mejor letras de más píxeles.
const OCR_WIDTH = 2400;

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Distancia de edición: cuántas letras hay que cambiar para pasar de una palabra a otra. */
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/**
 * Busca `target` entre las palabras leídas tolerando errores del OCR (una
 * letra cada cinco). Devuelve la palabra tal como se leyó, o null.
 */
function findFuzzy(words: string[], target: string): string | null {
  const wanted = plain(target).replace(/\s+/g, "");
  if (wanted.length < 2) return null;
  const tolerance = Math.floor(wanted.length / 5);
  // El nombre puede venir partido en varias palabras: se prueban también
  // pares y tríos seguidos.
  for (let size = 1; size <= 3; size++) {
    for (let start = 0; start + size <= words.length; start++) {
      const candidate = words.slice(start, start + size).join("");
      if (editDistance(plain(candidate), wanted) <= tolerance) return words.slice(start, start + size).join(" ");
    }
  }
  return null;
}

function wordsOf(blocks: { paragraphs: { lines: { words: Word[] }[] }[] }[] | null): Word[] {
  return (blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)));
}

/** Lo que se lee de los dígitos de una tira de la imagen; null si no hay un número creíble. */
function digitsOf(text: string): number | null {
  const match = text.replace(/[^\d]/g, "");
  return match.length >= 3 && match.length <= 10 ? Number(match) : null;
}

/** El valor que más se repite; en empate, el que tiene menos dígitos (sin el "1" del borde). */
function mostFrequent(values: number[]): number | null {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: number | null = null;
  for (const [value, count] of counts) {
    const bestCount = best === null ? 0 : (counts.get(best) ?? 0);
    if (count > bestCount || (count === bestCount && best !== null && value < best)) best = value;
  }
  return best;
}

export async function readCharacterScreenshot(
  image: Buffer,
  expected: { name: string; job: string | null }
): Promise<ScreenshotReading> {
  let source: { data: Buffer; info: OutputInfo };
  try {
    source = await sharp(image).resize({ width: OCR_WIDTH }).png().toBuffer({ resolveWithObject: true });
  } catch {
    throw new ScreenshotAnalysisError("No se pudo abrir la imagen. Sube la captura en JPG, PNG o WEBP.");
  }

  // Los datos de idioma se descargan la primera vez y quedan en la carpeta
  // temporal (la única escribible en Vercel) para las siguientes lecturas.
  const worker = await createWorker(["eng", "spa", "por"], 1, { cachePath: os.tmpdir() });
  try {
    // Dos pasadas a toda la imagen: en gris con contraste se leen bien el
    // nombre y el job; con umbral se separa mejor la etiqueta "Power" del
    // fondo de la ventana.
    const soft = await sharp(source.data).grayscale().normalize().png().toBuffer();
    const hard = await sharp(source.data).grayscale().threshold(200).png().toBuffer();
    const softResult = await worker.recognize(soft, {}, { blocks: true, text: true });
    const hardResult = await worker.recognize(hard, {}, { blocks: true, text: true });
    const allWords = [...wordsOf(softResult.data.blocks), ...wordsOf(hardResult.data.blocks)];
    const texts = allWords.map((word) => word.text).filter(Boolean);
    const plainTexts = texts.map(plain);

    // Power: se ubica la etiqueta y se lee la barra que tiene a la derecha,
    // solo con dígitos. El número va en blanco sobre la barra de color, que
    // la lectura general no alcanza a separar. Como el borde de la barra a
    // veces se lee como un "1" de más, se lee con varios recortes y versiones
    // de la imagen y gana el número que más se repite.
    // Etiquetas con lugar a su derecha para la barra (descarta lecturas
    // sueltas de "power" pegadas al borde).
    const labels = allWords.filter(
      (word) => POWER_WORDS.test(word.text.trim()) && source.info.width - word.bbox.x1 > OCR_WIDTH * 0.15
    );
    const readings: number[] = [];
    if (labels.length > 0) {
      await worker.setParameters({ tessedit_char_whitelist: "0123456789" });
    }
    for (const label of labels.slice(0, 2)) {
      const height = label.bbox.y1 - label.bbox.y0;
      // La barra va a la misma altura que la etiqueta: una franja apenas más
      // alta que ella, para no agarrar la línea de arriba (experiencia de job).
      const top = Math.max(0, Math.round(label.bbox.y0 - height * 0.15));
      for (const gap of [height * 0.3, height]) {
        const left = Math.round(label.bbox.x1 + gap);
        const band = {
          left,
          top,
          // Hasta donde termina la barra, sin llegar a la columna de stats.
          width: Math.min(Math.round(OCR_WIDTH * 0.32), source.info.width - left),
          height: Math.min(Math.round(height * 1.3), source.info.height - top),
        };
        for (const variant of [(s: Sharp) => s.grayscale(), (s: Sharp) => s.grayscale().negate()]) {
          const crop = await variant(sharp(source.data).extract(band).resize({ width: band.width * 2 }))
            .png()
            .toBuffer();
          // Bloque (6), una línea (7) y texto disperso (11): cada modo falla
          // en capturas distintas, por eso votan los tres.
          for (const mode of ["6", "7", "11"]) {
            await worker.setParameters({ tessedit_pageseg_mode: mode as never });
            const { data } = await worker.recognize(crop, {}, { blocks: true });
            // La palabra numérica más larga: así no se cuela el borde de la
            // barra, que sale como un "1" suelto.
            const longest = wordsOf(data.blocks)
              .map((word) => word.text.replace(/[^\d]/g, ""))
              .sort((a, b) => b.length - a.length)[0];
            const value = longest ? digitsOf(longest) : null;
            if (value !== null) readings.push(value);
          }
        }
      }
    }
    const power = mostFrequent(readings);
    const label = labels[0];

    const characterName = findFuzzy(texts, expected.name);

    // Job: primero el de la ficha (el caso esperado), si no cualquier otro.
    const jobCandidates = [
      ...(expected.job ? [expected.job] : []),
      ...JOB_ROLE_NAMES.filter((job) => job !== expected.job),
    ];
    let job: string | null = null;
    let jobAsShown: string | null = null;
    for (const candidate of jobCandidates) {
      const aliases = [candidate, ...(JOB_ALIASES[candidate as keyof typeof JOB_ALIASES] ?? [])];
      for (const alias of aliases) {
        const found = findFuzzy(texts, alias);
        if (found) {
          job = candidate;
          jobAsShown = found;
          break;
        }
      }
      if (job) break;
    }

    return {
      isCharacterWindow: Boolean(label) || WINDOW_WORDS.some((word) => plainTexts.includes(word)),
      characterName,
      job,
      jobAsShown,
      power,
    };
  } finally {
    await worker.terminate();
  }
}

/** Compara nombres sin importar mayúsculas, tildes ni espacios. */
export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  return Boolean(a && b) && normalize(a!) === normalize(b!);
}

// ---------------------------------------------------------------------------
// Comprobante firmado: lo que se leyó viaja al formulario y vuelve al enviar.
// Se firma para que no se pueda editar en el navegador (por ejemplo, subir el
// Power) entre el análisis y el envío.
// ---------------------------------------------------------------------------

export interface ScreenshotProof {
  discordId: string;
  job: string | null;
  characterName: string | null;
  power: number | null;
  /** Vence a la hora: la captura es de "ahora", no de una sesión vieja. */
  expiresAt: number;
}

const PROOF_TTL_MS = 60 * 60 * 1000;

function proofSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Falta ADMIN_SESSION_SECRET en las variables de entorno.");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", proofSecret()).update(`character-screenshot:${payload}`).digest("base64url");
}

export function createScreenshotProof(proof: Omit<ScreenshotProof, "expiresAt">): string {
  const payload = Buffer.from(JSON.stringify({ ...proof, expiresAt: Date.now() + PROOF_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readScreenshotProof(token: string, discordId: string): ScreenshotProof | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const proof = JSON.parse(Buffer.from(payload, "base64url").toString()) as ScreenshotProof;
    if (proof.discordId !== discordId || proof.expiresAt < Date.now()) return null;
    return proof;
  } catch {
    return null;
  }
}
