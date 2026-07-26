/**
 * Lee los grupos de amigos que ya están bloqueados (candado cerrado en
 * todas sus parties) en el board de Core Guild — para ofrecerlos como
 * opciones en el paso "¿vienes con un grupo de amigos?" de la encuesta de
 * Discord (ver survey-interactions.ts). Solo grupos ya bloqueados, no
 * cualquier etiqueta cargada: mismo criterio que la sección Amigos del
 * admin para saber cuándo un equipo está "terminado".
 */

import { prisma } from "@/lib/prisma";
import { computeFriendTeams } from "./friend-teams";
import { emptyCoreGuildBoardData, type CoreGuildBoardData } from "./types";

export interface ExistingGroup {
  tag: string;
  count: number;
}

export async function listExistingGroupTags(): Promise<ExistingGroup[]> {
  const board = await prisma.coreGuildBoard.findFirst();
  const data = (board?.data as CoreGuildBoardData | undefined) ?? emptyCoreGuildBoardData();

  return computeFriendTeams(data.members, data.parties)
    .filter((team) => team.allLocked)
    .map((team) => ({ tag: team.name, count: team.members.length }));
}
