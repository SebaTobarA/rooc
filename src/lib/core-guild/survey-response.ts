/**
 * Aplica la respuesta de un miembro a la encuesta de organización de
 * Discord (ver survey-interactions.ts) directamente al board de Core
 * Guild — a diferencia del resto del módulo, que solo se edita a mano
 * desde /admin/core-guild, esta escritura la dispara el propio miembro
 * respondiendo botones, así que crea o actualiza su fila sin pasar por el
 * flujo de "editar -> guardar" del panel.
 *
 * No usa una transacción con lock explícito: dos respuestas de la encuesta
 * llegando en el mismo instante son un caso borde despreciable para el
 * tamaño de esta guild, no algo que justifique optimistic locking acá.
 */

import { prisma } from "@/lib/prisma";
import { addGuildMemberRole } from "@/lib/discord-bot";
import { GUILD_CHOICE_ROLE_ID } from "./guild-choice";
import { emptyCoreGuildBoardData, type CoreGuildBoardData, type CoreMember, type GuildChoice } from "./types";

export type SurveyGroupChoice = { kind: "SOLO" } | { kind: "EXISTING" | "NEW"; tag: string };

export interface SurveyResponseInput {
  discordId: string;
  username: string;
  globalName: string | null;
  nick: string | null;
  avatarHash: string | null;
  suggestedJobRole: string | null;
  guildChoice: GuildChoice;
  group: SurveyGroupChoice;
}

/** Persiste la respuesta en el board — crea la fila del miembro si es la primera vez que aparece. */
export async function applyCoreGuildSurveyResponse(input: SurveyResponseInput): Promise<void> {
  const existingBoard = await prisma.coreGuildBoard.findFirst();
  const data: CoreGuildBoardData = (existingBoard?.data as CoreGuildBoardData | undefined) ?? emptyCoreGuildBoardData();

  const groupMode = input.group.kind === "SOLO" ? "SOLO" : "GROUP";
  const groupTag = input.group.kind === "SOLO" ? "" : input.group.tag;

  const idx = data.members.findIndex((m) => m.discordId === input.discordId);
  if (idx >= 0) {
    const existing = data.members[idx];
    const updated: CoreMember = {
      ...existing,
      username: input.username,
      globalName: input.globalName,
      nick: input.nick,
      avatarHash: input.avatarHash,
      inCore: true,
      guildChoice: input.guildChoice,
      groupMode,
      groupTag,
    };
    data.members = [...data.members.slice(0, idx), updated, ...data.members.slice(idx + 1)];
  } else {
    const created: CoreMember = {
      discordId: input.discordId,
      username: input.username,
      globalName: input.globalName,
      nick: input.nick,
      avatarHash: input.avatarHash,
      jobRole: input.suggestedJobRole ?? "",
      groupMode,
      groupTag,
      walletType: "F2P",
      inCore: true,
      partyId: null,
      guildChoice: input.guildChoice,
    };
    data.members = [...data.members, created];
  }

  if (existingBoard) {
    await prisma.coreGuildBoard.update({ where: { id: existingBoard.id }, data: { data: data as object } });
  } else {
    await prisma.coreGuildBoard.create({ data: { data: data as object, locked: false } });
  }
}

/** Si el miembro no tiene todavía el rol de Discord de su guild elegida, se lo asigna (SD4 no tiene rol propio, no hace nada). */
export async function ensureGuildChoiceRole(discordId: string, guildChoice: GuildChoice, currentRoles: string[]): Promise<void> {
  const roleId = GUILD_CHOICE_ROLE_ID[guildChoice];
  if (!roleId || currentRoles.includes(roleId)) return;
  await addGuildMemberRole(discordId, roleId);
}
