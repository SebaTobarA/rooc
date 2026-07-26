/**
 * Lee los grupos que ya están bloqueados (candado cerrado) en
 * /admin/core-guild — Organización de Grupos — para ofrecerlos como
 * opciones en el paso "¿vienes con un grupo de amigos?" de la encuesta de
 * Discord (ver survey-interactions.ts). Solo grupos ya bloqueados, no
 * cualquier etiqueta cargada: recién ahí el admin los considera "listos".
 */

import { prisma } from "@/lib/prisma";
import { emptyCoreGuildBoardData, type CoreGuildBoardData } from "./types";

export interface ExistingGroup {
  tag: string;
  count: number;
}

export async function listExistingGroupTags(): Promise<ExistingGroup[]> {
  const board = await prisma.coreGuildBoard.findFirst();
  const data = (board?.data as CoreGuildBoardData | undefined) ?? emptyCoreGuildBoardData();

  return data.parties
    .filter((party) => party.locked)
    .map((party) => ({
      tag: party.name,
      count: data.members.filter((m) => m.inCore && m.partyId === party.id).length,
    }))
    .filter((group) => group.count > 0);
}
