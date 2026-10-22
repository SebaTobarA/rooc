/**
 * Lectura de la captura de la ventana "Character" del juego que el jugador
 * sube al actualizar su ficha Core (ver analyzeMyCharacterScreenshot). Sirve
 * solo para leer el Power y comprobar que el que escribió el jugador es el
 * real. Se lee con OCR (Tesseract.js) en el servidor, sin servicios externos
 * de pago, y la imagen se descarta: no se guarda en ningún lado.
 *
 * El juego puede estar en español, portugués o inglés: la etiqueta es
 * "Power" o "Poder".
 */

import "server-only";
import os from "node:os";
import { createHmac, timingSafeEqual } from "node:crypto";
import sharp, { type OutputInfo, type Sharp } from "sharp";
import { createWorker, type Word } from "tesseract.js";

export interface ScreenshotReading {
  /** false = no apareció la etiqueta "Power"/"Poder": no es la ventana del personaje. */
  isCharacterWindow: boolean;
  power: number | null;
}

export class ScreenshotAnalysisError extends Error {}

const POWER_WORDS = /^(power|poder)$/i;

// Las capturas se agrandan a este ancho antes de leerlas: el texto del juego
// es chico y Tesseract lee mejor letras de más píxeles.
const OCR_WIDTH = 2400;

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

export async function readCharacterScreenshot(image: Buffer): Promise<ScreenshotReading> {
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
    // Para ubicar la etiqueta "Power": con umbral se separa mejor del fondo
    // de la ventana; si así no aparece, se prueba en gris con contraste.
    let labels: Word[] = [];
    for (const prepare of [(s: Sharp) => s.grayscale().threshold(200), (s: Sharp) => s.grayscale().normalize()]) {
      const page = await prepare(sharp(source.data)).png().toBuffer();
      const { data } = await worker.recognize(page, {}, { blocks: true });
      // Etiquetas con lugar a su derecha para la barra (descarta lecturas
      // sueltas de "power" pegadas al borde).
      labels = wordsOf(data.blocks).filter(
        (word) => POWER_WORDS.test(word.text.trim()) && source.info.width - word.bbox.x1 > OCR_WIDTH * 0.15
      );
      if (labels.length > 0) break;
    }
    if (labels.length === 0) return { isCharacterWindow: false, power: null };

    // Se lee la barra que tiene a la derecha, solo con dígitos. El número va
    // en blanco sobre la barra de color, que la lectura general no alcanza a
    // separar. Como el borde de la barra a veces se lee como un "1" de más,
    // se lee con varios recortes y versiones de la imagen y gana el número
    // que más se repite.
    await worker.setParameters({ tessedit_char_whitelist: "0123456789" });
    const readings: number[] = [];
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
    return { isCharacterWindow: true, power: mostFrequent(readings) };
  } finally {
    await worker.terminate();
  }
}

// ---------------------------------------------------------------------------
// Comprobante firmado: el Power leído viaja al formulario y vuelve al enviar,
// donde se compara con el que escribió el jugador. Se firma para que no se
// pueda cambiar en el navegador entre el análisis y el envío.
// ---------------------------------------------------------------------------

export interface ScreenshotProof {
  discordId: string;
  power: number;
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
