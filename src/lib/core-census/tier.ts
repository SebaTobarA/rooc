/**
 * "Asistencia regular" del censo Core: de los eventos de guild de un mes
 * (3 por semana: Guild League martes y jueves, Emperium Overrun domingo)
 * sale un tier por miembro.
 *
 *   S — no faltó a ningún evento del mes y estuvo siempre en Discord.
 *   A — faltó 1 o 2 veces.
 *   B — faltó 3 veces o más.
 *
 * Qué es una falta: un evento ya censado donde la persona no estuvo en el
 * juego o no estuvo en la voz de Discord, y que no quedó justificado. Una
 * falta justificada (avisada con anticipación, con nota) queda registrada
 * pero no baja el tier.
 */

import { chileWallTimeToUtc } from "@/lib/chile-time";

export type CensusTier = "S" | "A" | "B";

export interface CensusRecordLike {
  inGame: boolean;
  inDiscord: boolean;
  justified: boolean;
  points: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
}

export type RecordOutcome = "ATTENDED" | "NO_DISCORD" | "ABSENT" | "JUSTIFIED";

export function recordOutcome(record: Pick<CensusRecordLike, "inGame" | "inDiscord" | "justified">): RecordOutcome {
  if (record.inGame && record.inDiscord) return "ATTENDED";
  if (record.justified) return "JUSTIFIED";
  return record.inGame ? "NO_DISCORD" : "ABSENT";
}

export const RECORD_OUTCOME_LABEL: Record<RecordOutcome, string> = {
  ATTENDED: "Asistió",
  NO_DISCORD: "Sin Discord",
  ABSENT: "Faltó",
  JUSTIFIED: "Justificada",
};

export interface MemberMonthSummary {
  /** Eventos censados del mes en los que la persona tiene registro. */
  events: number;
  attended: number;
  inGame: number;
  inDiscord: number;
  justified: number;
  /** Faltas que cuentan para el tier (sin justificar). */
  faults: number;
  /** Promedio de puntos en los eventos jugados con puntos cargados; null si no hay. */
  avgPoints: number | null;
  kills: number;
  deaths: number;
  assists: number;
  /** (K + A) / D sobre el mes; null si no hay KDA cargado. */
  kda: number | null;
  /** null = sin eventos censados todavía, no hay nada que evaluar. */
  tier: CensusTier | null;
}

export function tierFromFaults(faults: number): CensusTier {
  if (faults === 0) return "S";
  return faults <= 2 ? "A" : "B";
}

export function summarizeMonth(records: CensusRecordLike[]): MemberMonthSummary {
  const summary: MemberMonthSummary = {
    events: records.length,
    attended: 0,
    inGame: 0,
    inDiscord: 0,
    justified: 0,
    faults: 0,
    avgPoints: null,
    kills: 0,
    deaths: 0,
    assists: 0,
    kda: null,
    tier: null,
  };

  let pointsTotal = 0;
  let pointsCount = 0;
  let hasKda = false;

  for (const record of records) {
    if (record.inGame) summary.inGame += 1;
    if (record.inDiscord) summary.inDiscord += 1;

    const outcome = recordOutcome(record);
    if (outcome === "ATTENDED") summary.attended += 1;
    else if (outcome === "JUSTIFIED") summary.justified += 1;
    else summary.faults += 1;

    if (!record.inGame) continue;
    if (record.points !== null) {
      pointsTotal += record.points;
      pointsCount += 1;
    }
    if (record.kills !== null || record.deaths !== null || record.assists !== null) {
      hasKda = true;
      summary.kills += record.kills ?? 0;
      summary.deaths += record.deaths ?? 0;
      summary.assists += record.assists ?? 0;
    }
  }

  if (pointsCount > 0) summary.avgPoints = pointsTotal / pointsCount;
  if (hasKda) summary.kda = (summary.kills + summary.assists) / Math.max(1, summary.deaths);
  if (records.length > 0) summary.tier = tierFromFaults(summary.faults);

  return summary;
}

// ---------------------------------------------------------------------------
// Meses: siempre en hora de Chile, igual que los horarios de los eventos.
// ---------------------------------------------------------------------------

const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "YYYY-MM" del mes en curso en Santiago. */
export function currentMonthKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

/** Valida un "YYYY-MM" que viene de la URL; cae al mes en curso si no sirve. */
export function parseMonthKey(value: string | undefined): string {
  return value && MONTH_KEY_PATTERN.test(value) ? value : currentMonthKey();
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Rango [start, end) en UTC del mes, medido de medianoche a medianoche de Chile. */
export function monthRange(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split("-").map(Number);
  const [nextYear, nextMonth] = shiftMonthKey(monthKey, 1).split("-").map(Number);
  return {
    start: chileWallTimeToUtc(year, month, 1, 0, 0),
    end: chileWallTimeToUtc(nextYear, nextMonth, 1, 0, 0),
  };
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 15))
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}
