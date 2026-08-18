/**
 * Publica/actualiza el mensaje público y en vivo de la encuesta de
 * organización — a diferencia del roster de eventos (un Event por vez),
 * acá solo hay un mensaje fijo por guild: se publica una vez y de ahí en
 * más cada respuesta de survey-interactions.ts vuelve a llamar a esta
 * misma función (sin channelId) para refrescarlo en el lugar.
 */

import { prisma } from "@/lib/prisma";
import { editChannelMessage, postChannelMessage } from "@/lib/discord-bot";
import { buildAreYouInGuildComponents, buildSurveyRosterEmbed } from "@/lib/discord-core-guild-survey-embed";
import { getCoreGuildRoster } from "./sync";
import { emptyCoreGuildBoardData, type CoreGuildBoardData } from "./types";

export async function renderAndPublishSurveyRoster(targetChannelId?: string): Promise<void> {
  const board = await prisma.coreGuildBoard.findFirst();
  const data: CoreGuildBoardData = (board?.data as CoreGuildBoardData | undefined) ?? emptyCoreGuildBoardData();
  const coreRoster = await getCoreGuildRoster();
  const embed = buildSurveyRosterEmbed(data.members, coreRoster);
  const components = buildAreYouInGuildComponents();

  if (data.surveyMessage) {
    const edited = await editChannelMessage(data.surveyMessage.channelId, data.surveyMessage.messageId, {
      embeds: [embed],
      components,
    });
    if (edited) return;
    // El mensaje ya no está en Discord (lo borraron a mano): se republica en
    // el mismo canal en vez de fallar.
    targetChannelId = targetChannelId ?? data.surveyMessage.channelId;
  }

  if (!targetChannelId) {
    throw new Error("Todavía no se publicó la encuesta — elige un canal para publicarla primero.");
  }

  const message = await postChannelMessage(targetChannelId, { embeds: [embed], components });
  data.surveyMessage = { channelId: targetChannelId, messageId: message.id };

  if (board) {
    await prisma.coreGuildBoard.update({ where: { id: board.id }, data: { data: data as object } });
  } else {
    await prisma.coreGuildBoard.create({ data: { data: data as object, locked: false } });
  }
}
