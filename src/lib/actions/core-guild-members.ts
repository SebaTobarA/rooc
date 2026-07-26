"use server";

/**
 * Server actions de la sección Miembros Core — independiente del resto de
 * /admin/core-guild: no pasa por "Editar"/"Guardar", cada cambio se
 * persiste al toque, y getCoreGuildMembersSnapshot() es lo que polean
 * tanto esta sección como el resto del board (ver use-core-guild-board.ts)
 * para reflejar cambios de otros editores sin recargar la página.
 */

import { prisma } from "@/lib/prisma";
import { getCoreGuildRoster } from "@/lib/core-guild/sync";
import { reconcileMembers } from "@/lib/core-guild/reconcile";
import { emptyCoreGuildBoardData, type CoreGuildBoardData, type CoreMember } from "@/lib/core-guild/types";

async function readBoardData(): Promise<{ id: string | null; data: CoreGuildBoardData }> {
  const board = await prisma.coreGuildBoard.findFirst();
  return { id: board?.id ?? null, data: (board?.data as CoreGuildBoardData | undefined) ?? emptyCoreGuildBoardData() };
}

async function writeMembers(id: string | null, data: CoreGuildBoardData, members: CoreMember[]): Promise<void> {
  const next = { ...data, members };
  if (id) {
    await prisma.coreGuildBoard.update({ where: { id }, data: { data: next as object } });
  } else {
    await prisma.coreGuildBoard.create({ data: { data: next as object, locked: false } });
  }
}

/**
 * Trae el roster fresco de Discord, lo reconcilia con lo guardado, persiste
 * el resultado (así un miembro nuevo queda con fila propia desde el primer
 * poll) y devuelve la lista completa — es lo que consume tanto esta
 * sección como el resto del board para refrescarse en segundo plano.
 */
export async function getCoreGuildMembersSnapshot(): Promise<CoreMember[]> {
  const roster = await getCoreGuildRoster();
  const { id, data } = await readBoardData();
  const members = reconcileMembers(roster, data.members ?? []);
  await writeMembers(id, data, members);
  return members;
}

export type CoreMemberEditablePatch = Partial<
  Pick<CoreMember, "jobRole" | "groupMode" | "groupTag" | "walletType" | "guildChoice">
>;

/** Actualiza los campos editables de un miembro puntual — se llama en cada blur/change, sin botón de guardar. */
export async function updateCoreMemberField(discordId: string, patch: CoreMemberEditablePatch): Promise<void> {
  const { id, data } = await readBoardData();
  const idx = data.members.findIndex((m) => m.discordId === discordId);
  if (idx === -1) return;

  const updated = [...data.members];
  updated[idx] = { ...updated[idx], ...patch };
  await writeMembers(id, data, updated);
}

/** Saca a un miembro que ya no tiene el rol Core de la tabla — mismo botón "Quitar" de antes, ahora persiste directo. */
export async function removeCoreMember(discordId: string): Promise<void> {
  const { id, data } = await readBoardData();
  await writeMembers(id, data, data.members.filter((m) => m.discordId !== discordId));
}
