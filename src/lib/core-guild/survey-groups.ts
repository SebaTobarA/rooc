/**
 * Lee los grupos de amigos que ya existen en el board de Core Guild — para
 * ofrecerlos como opciones en el paso "¿vienes con un grupo de amigos?" de
 * la encuesta de Discord (ver survey-interactions.ts). Solo lectura, no
 * hace falta pasar por el cliente de React (use-core-guild-board.ts ya
 * tiene su propio computeFriendTeams para la sección Amigos del admin).
 */

import { prisma } from "@/lib/prisma";
import type { CoreGuildBoardData } from "./types";

export interface ExistingGroup {
  tag: string;
  count: number;
}

export async function listExistingGroupTags(): Promise<ExistingGroup[]> {
  const board = await prisma.coreGuildBoard.findFirst();
  const data = board?.data as CoreGuildBoardData | undefined;
  const members = data?.members ?? [];

  const byKey = new Map<string, ExistingGroup>();
  for (const member of members) {
    if (member.groupMode !== "GROUP") continue;
    const tag = member.groupTag?.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    const existing = byKey.get(key);
    if (existing) existing.count++;
    else byKey.set(key, { tag, count: 1 });
  }

  return [...byKey.values()].sort((a, b) => b.count - a.count);
}
