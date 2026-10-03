/**
 * Lecturas de servidor de Evaluación de CORE — la hoja de vida de cada
 * jugador que tiene o tuvo el rol [SD] Core y cómo le fue en un mes. Lo
 * comparten el listado, la hoja de vida de cada jugador y el reporte de cada
 * evento.
 */

import type { CoreCharacterSheet, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCoreGuildRoster } from "@/lib/core-guild/sync";
import { monthRange, summarizeMonth, type MemberMonthSummary } from "./tier";

export interface CorePlayer {
  discordId: string;
  username: string;
  /** Apodo del server, o el nombre global si no tiene. */
  displayName: string;
  avatarHash: string | null;
  job: string | null;
  /** Personaje in-game: el de la ficha, si no el del registro de Boo, si no el apodo. */
  characterName: string;
  /** false = ya no tiene el rol; su ficha se conserva. */
  inCore: boolean;
  sheet: CoreCharacterSheet;
}

/**
 * Pone las fichas al día con el rol [SD] Core de Discord:
 *  - alguien con el rol y sin ficha: se le crea, y empieza su primer periodo;
 *  - alguien con ficha que recuperó el rol: se reactiva la misma ficha y
 *    empieza un periodo nuevo;
 *  - alguien con ficha que perdió el rol: queda como ex miembro y se cierra
 *    su periodo. Nunca se borra nada.
 * Se llama al abrir el módulo, así que las fechas de los periodos son las de
 * esa visita, no el instante exacto en que cambió el rol.
 */
export async function syncCorePlayers(): Promise<void> {
  const roster = await getCoreGuildRoster();
  const sheets = await prisma.coreCharacterSheet.findMany();
  const sheetById = new Map(sheets.map((sheet) => [sheet.discordId, sheet]));
  const rosterIds = new Set(roster.map((entry) => entry.discordId));
  const now = new Date();

  const writes: Prisma.PrismaPromise<unknown>[] = [];

  for (const entry of roster) {
    const identity = {
      username: entry.username,
      displayName: entry.nick ?? entry.globalName ?? entry.username,
      avatarHash: entry.avatarHash,
      jobName: entry.suggestedJobRole,
    };
    const sheet = sheetById.get(entry.discordId);
    if (!sheet) {
      writes.push(prisma.coreCharacterSheet.create({ data: { discordId: entry.discordId, ...identity } }));
      continue;
    }
    const changed =
      !sheet.inCore ||
      sheet.username !== identity.username ||
      sheet.displayName !== identity.displayName ||
      sheet.avatarHash !== identity.avatarHash ||
      sheet.jobName !== identity.jobName;
    if (changed) {
      writes.push(
        prisma.coreCharacterSheet.update({ where: { id: sheet.id }, data: { ...identity, inCore: true } })
      );
    }
  }

  // Un roster vacío con fichas activas es casi seguro una respuesta rara de
  // Discord, no que se haya ido todo el core: no se da de baja a nadie.
  const left = roster.length > 0 ? sheets.filter((sheet) => sheet.inCore && !rosterIds.has(sheet.discordId)) : [];
  const leftIds = left.map((sheet) => sheet.discordId);

  // Fichas creadas antes de que existieran los periodos (o por guardado
  // directo): se les abre el periodo que les falta.
  const openPeriods = await prisma.coreMembershipPeriod.findMany({
    where: { endedAt: null },
    select: { discordId: true },
  });
  const hasOpenPeriod = new Set(openPeriods.map((period) => period.discordId));
  const needPeriod = roster
    .map((entry) => entry.discordId)
    .filter((discordId) => !hasOpenPeriod.has(discordId));

  if (leftIds.length > 0) {
    writes.push(
      prisma.coreCharacterSheet.updateMany({ where: { discordId: { in: leftIds } }, data: { inCore: false } }),
      prisma.coreMembershipPeriod.updateMany({
        where: { discordId: { in: leftIds }, endedAt: null },
        data: { endedAt: now },
      })
    );
  }
  if (needPeriod.length > 0) {
    writes.push(
      prisma.coreMembershipPeriod.createMany({
        data: needPeriod.map((discordId) => ({ discordId, startedAt: now })),
      })
    );
  }

  if (writes.length > 0) await prisma.$transaction(writes);
}

/**
 * Todos los jugadores con ficha, activos y ex miembros. Con `sync` primero se
 * pone al día contra Discord; si Discord falla igual se devuelve lo guardado,
 * con el error aparte para avisarlo.
 */
export async function loadCorePlayers(
  options: { sync?: boolean } = {}
): Promise<{ players: CorePlayer[]; syncError: string | null }> {
  let syncError: string | null = null;
  if (options.sync) {
    try {
      await syncCorePlayers();
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Error desconocido";
    }
  }

  const sheets = await prisma.coreCharacterSheet.findMany();
  const registrations = await prisma.memberRegistration.findMany({
    where: { discordId: { in: sheets.map((sheet) => sheet.discordId) } },
    select: { discordId: true, nickname: true },
  });
  const nickById = new Map(registrations.map((registration) => [registration.discordId, registration.nickname]));

  const players = sheets
    .map((sheet) => {
      const displayName = sheet.displayName || sheet.username || sheet.discordId;
      return {
        discordId: sheet.discordId,
        username: sheet.username,
        displayName,
        avatarHash: sheet.avatarHash,
        job: sheet.jobName,
        characterName: sheet.characterName || nickById.get(sheet.discordId) || displayName,
        inCore: sheet.inCore,
        sheet,
      };
    })
    .sort((a, b) => a.characterName.localeCompare(b.characterName));

  return { players, syncError };
}

/** Eventos de guild que empiezan dentro del mes, del más viejo al más nuevo. */
export async function loadMonthEvents(monthKey: string) {
  const { start, end } = monthRange(monthKey);
  return prisma.event.findMany({
    where: { startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      category: true,
      startsAt: true,
      coreCensusAt: true,
      template: { select: { icon: true } },
    },
  });
}

/** Resumen del mes por discordId — solo cuentan los eventos con el reporte ya guardado. */
export async function loadMonthSummaries(monthKey: string): Promise<Map<string, MemberMonthSummary>> {
  const { start, end } = monthRange(monthKey);
  const records = await prisma.coreEventRecord.findMany({
    where: { event: { startsAt: { gte: start, lt: end }, coreCensusAt: { not: null } } },
  });

  const byMember = new Map<string, typeof records>();
  for (const record of records) {
    const list = byMember.get(record.discordId) ?? [];
    list.push(record);
    byMember.set(record.discordId, list);
  }

  return new Map([...byMember].map(([discordId, list]) => [discordId, summarizeMonth(list)]));
}
