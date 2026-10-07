/**
 * Rendimiento de un jugador a partir de sus reportes post evento: cuántas
 * veces jugó cada job y con cuál le fue mejor. Guild League y Emperium
 * Overrun nunca se mezclan: sus puntajes no son comparables.
 */

import type { EventCategory } from "@prisma/client";
import type { CensusRecordLike } from "./tier";

export const EVENT_CATEGORIES = ["GUILD_LEAGUE", "EMPERIUM_OVERRUN"] as const satisfies readonly EventCategory[];

export interface PerformanceRecord extends CensusRecordLike {
  id: string;
  jobName: string | null;
  partyName: string | null;
  event: { category: EventCategory; startsAt: Date };
}

export interface JobCategoryStats {
  /** Eventos de ese tipo jugados con el job. */
  played: number;
  /** Promedio de puntos en los que tienen puntos cargados; null si ninguno. */
  avgPoints: number | null;
}

export interface JobStats {
  job: string;
  total: number;
  byCategory: Record<EventCategory, JobCategoryStats>;
}

export function jobStats(records: PerformanceRecord[]): JobStats[] {
  const byJob = new Map<string, Record<EventCategory, { played: number; points: number; withPoints: number }>>();
  for (const record of records) {
    if (!record.inGame || !record.jobName) continue;
    const entry = byJob.get(record.jobName) ?? {
      GUILD_LEAGUE: { played: 0, points: 0, withPoints: 0 },
      EMPERIUM_OVERRUN: { played: 0, points: 0, withPoints: 0 },
    };
    const bucket = entry[record.event.category];
    bucket.played += 1;
    if (record.points !== null) {
      bucket.points += record.points;
      bucket.withPoints += 1;
    }
    byJob.set(record.jobName, entry);
  }

  const toStats = (bucket: { played: number; points: number; withPoints: number }): JobCategoryStats => ({
    played: bucket.played,
    avgPoints: bucket.withPoints > 0 ? bucket.points / bucket.withPoints : null,
  });

  return [...byJob]
    .map(([job, entry]) => ({
      job,
      total: entry.GUILD_LEAGUE.played + entry.EMPERIUM_OVERRUN.played,
      byCategory: { GUILD_LEAGUE: toStats(entry.GUILD_LEAGUE), EMPERIUM_OVERRUN: toStats(entry.EMPERIUM_OVERRUN) },
    }))
    .sort((a, b) => b.total - a.total);
}

/** El job con mejor promedio de puntos en cada tipo de evento; sin entrada si no hay puntos cargados. */
export function bestJobs(stats: JobStats[]): { category: EventCategory; job: string; avgPoints: number; played: number }[] {
  return EVENT_CATEGORIES.flatMap((category) => {
    const best = stats
      .filter((row) => row.byCategory[category].avgPoints !== null)
      .sort((a, b) => (b.byCategory[category].avgPoints ?? 0) - (a.byCategory[category].avgPoints ?? 0))[0];
    if (!best) return [];
    const { avgPoints, played } = best.byCategory[category];
    return [{ category, job: best.job, avgPoints: avgPoints ?? 0, played }];
  });
}
