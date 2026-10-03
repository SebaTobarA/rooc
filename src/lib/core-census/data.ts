/**
 * Lecturas de servidor del censo Core — quiénes son los miembros (rol
 * [SD] Core en vivo desde Discord, con su ficha y su nick in-game) y cómo
 * les fue en un mes. Lo comparten el panel, la ficha de cada miembro y la
 * carga de cada evento.
 */

import type { CoreCharacterSheet } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCoreGuildRoster } from "@/lib/core-guild/sync";
import { monthRange, summarizeMonth, type MemberMonthSummary } from "./tier";

export interface CensusMember {
  discordId: string;
  username: string;
  /** Apodo del server, o el nombre global si no tiene. */
  displayName: string;
  avatarHash: string | null;
  job: string | null;
  /** Personaje in-game: el de la ficha, si no el del registro de Boo, si no el apodo. */
  characterName: string;
  sheet: CoreCharacterSheet | null;
}

export async function loadCensusMembers(): Promise<CensusMember[]> {
  const roster = await getCoreGuildRoster();
  const discordIds = roster.map((entry) => entry.discordId);

  const [sheets, registrations] = await Promise.all([
    prisma.coreCharacterSheet.findMany({ where: { discordId: { in: discordIds } } }),
    prisma.memberRegistration.findMany({
      where: { discordId: { in: discordIds } },
      select: { discordId: true, nickname: true },
    }),
  ]);
  const sheetById = new Map(sheets.map((sheet) => [sheet.discordId, sheet]));
  const nickById = new Map(registrations.map((registration) => [registration.discordId, registration.nickname]));

  return roster
    .map((entry) => {
      const sheet = sheetById.get(entry.discordId) ?? null;
      const displayName = entry.nick ?? entry.globalName ?? entry.username;
      return {
        discordId: entry.discordId,
        username: entry.username,
        displayName,
        avatarHash: entry.avatarHash,
        job: entry.suggestedJobRole,
        characterName: sheet?.characterName || nickById.get(entry.discordId) || displayName,
        sheet,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
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

/** Resumen del mes por discordId — solo cuentan los eventos con el censo ya guardado. */
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
