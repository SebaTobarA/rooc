/**
 * Maneja los clics/selecciones/modal de la encuesta de organización
 * publicada por publishCoreGuildSurvey() — llamado desde
 * src/app/api/discord/interactions/route.ts cuando el custom_id empieza
 * con "cgs:" (Core Guild Survey), separado del flujo de eventos para no
 * mezclar los dos esquemas de custom_id.
 *
 * El mensaje original de la encuesta es público, pero cada persona que lo
 * clickea arranca su propia conversación efímera (flags 64) que va
 * mutando con type 6/7 (UPDATE_MESSAGE), igual que el flujo de
 * "Participar" de eventos — el mensaje público en sí se re-edita aparte
 * (ver renderAndPublishSurveyRoster) cada vez que una respuesta se
 * confirma, para que se vea en vivo quién ya respondió.
 */

import { after } from "next/server";
import { getGuildRolesCached } from "@/lib/discord-bot";
import { resolveJobFromRoles } from "@/lib/discord-job-roles";
import { editInteractionOriginal } from "@/lib/discord-interaction-webhook";
import {
  NOT_IN_GUILD_MESSAGE,
  buildExistingGroupSelectComponents,
  buildFriendGroupQuestionComponents,
  buildGuildSelectComponents,
  buildNewGroupModal,
  buildSurveyConfirmationEmbed,
  buildSurveyErrorEmbed,
  buildSurveyStepEmbed,
} from "@/lib/discord-core-guild-survey-embed";
import { GUILD_CHOICE_LABELS, GUILD_CHOICE_OPTIONS } from "./guild-choice";
import { listExistingGroupTags } from "./survey-groups";
import { applyCoreGuildSurveyResponse, ensureGuildChoiceRole, type SurveyGroupChoice } from "./survey-response";
import { renderAndPublishSurveyRoster } from "./survey-roster";
import type { GuildChoice } from "./types";

export interface SurveyInteractionMember {
  user: { id: string; username: string; global_name: string | null; avatar: string | null };
  nick: string | null;
  roles: string[];
}

export interface SurveyComponentInteraction {
  token: string;
  member: SurveyInteractionMember;
  data: { custom_id: string; values?: string[] };
}

export interface SurveyModalInteraction {
  token: string;
  member: SurveyInteractionMember;
  data: { custom_id: string; components: { components: { custom_id: string; value: string }[] }[] };
}

function parseGuildChoice(value: string | undefined): GuildChoice | null {
  return value && (GUILD_CHOICE_OPTIONS as string[]).includes(value) ? (value as GuildChoice) : null;
}

async function safeEdit(token: string, message: string) {
  try {
    await editInteractionOriginal(token, { embeds: [buildSurveyErrorEmbed(message)], components: [] });
  } catch {
    // Si ni siquiera esto funciona no queda mucho más por hacer.
  }
}

async function finalizeSurveyResponse(
  member: SurveyInteractionMember,
  guild: GuildChoice,
  group: SurveyGroupChoice
): Promise<void> {
  const guildRoles = await getGuildRolesCached();
  const suggestedJobRole = resolveJobFromRoles(member.roles, guildRoles);
  await applyCoreGuildSurveyResponse({
    discordId: member.user.id,
    username: member.user.username,
    globalName: member.user.global_name,
    nick: member.nick,
    avatarHash: member.user.avatar,
    suggestedJobRole,
    guildChoice: guild,
    group,
  });
  await ensureGuildChoiceRole(member.user.id, guild, member.roles);
  // Refresca el mensaje público en vivo — se edita in-place, ver survey-roster.ts.
  await renderAndPublishSurveyRoster();
}

const RESTART_MESSAGE = "Ocurrió un error, empieza de nuevo desde el mensaje original de la encuesta.";

export async function handleCoreGuildSurveyComponent(interaction: SurveyComponentInteraction): Promise<Response> {
  const parts = interaction.data.custom_id.split(":");
  const step = parts[1];
  const token = interaction.token;

  if (step === "guild") {
    if (parts[2] === "n") {
      return Response.json({ type: 4, data: { flags: 64, embeds: [buildSurveyStepEmbed(NOT_IN_GUILD_MESSAGE)] } });
    }
    return Response.json({
      type: 4,
      data: { flags: 64, embeds: [buildSurveyStepEmbed("¿Cuál guild?")], components: buildGuildSelectComponents() },
    });
  }

  if (step === "guildsel") {
    const guild = parseGuildChoice(interaction.data.values?.[0]);
    if (!guild) return Response.json({ type: 7, data: { embeds: [buildSurveyErrorEmbed(RESTART_MESSAGE)], components: [] } });
    return Response.json({
      type: 7,
      data: {
        embeds: [buildSurveyStepEmbed("¿Vienes con un grupo de amigos?")],
        components: buildFriendGroupQuestionComponents(guild),
      },
    });
  }

  if (step === "fr") {
    const answer = parts[2];
    const guild = parseGuildChoice(parts[3]);
    if (!guild) return Response.json({ type: 7, data: { embeds: [buildSurveyErrorEmbed(RESTART_MESSAGE)], components: [] } });

    if (answer === "new") {
      return Response.json({ type: 9, data: buildNewGroupModal(guild) });
    }

    if (answer === "n") {
      after(async () => {
        try {
          await finalizeSurveyResponse(interaction.member, guild, { kind: "SOLO" });
          await editInteractionOriginal(token, {
            embeds: [buildSurveyConfirmationEmbed(GUILD_CHOICE_LABELS[guild], "Solitario")],
            components: [],
          });
        } catch (err) {
          await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
        }
      });
      return Response.json({ type: 6 });
    }

    // answer === "y": listar los grupos que ya existen para elegir uno.
    after(async () => {
      try {
        const groups = await listExistingGroupTags();
        if (groups.length === 0) {
          await editInteractionOriginal(token, {
            embeds: [
              buildSurveyStepEmbed('Todavía no hay grupos creados — vuelve a elegir "Mi grupo no está" para crear el primero.'),
            ],
            components: [],
          });
          return;
        }
        await editInteractionOriginal(token, {
          embeds: [buildSurveyStepEmbed("¿Cuál es tu grupo?")],
          components: buildExistingGroupSelectComponents(guild, groups),
        });
      } catch (err) {
        await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
      }
    });
    return Response.json({ type: 6 });
  }

  if (step === "groupsel") {
    const guild = parseGuildChoice(parts[2]);
    const tag = interaction.data.values?.[0];
    if (!guild || !tag) return Response.json({ type: 7, data: { embeds: [buildSurveyErrorEmbed(RESTART_MESSAGE)], components: [] } });

    after(async () => {
      try {
        await finalizeSurveyResponse(interaction.member, guild, { kind: "EXISTING", tag });
        await editInteractionOriginal(token, {
          embeds: [buildSurveyConfirmationEmbed(GUILD_CHOICE_LABELS[guild], tag)],
          components: [],
        });
      } catch (err) {
        await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
      }
    });
    return Response.json({ type: 6 });
  }

  return Response.json({ type: 4, data: { flags: 64, embeds: [buildSurveyErrorEmbed("Acción no reconocida.")] } });
}

export async function handleCoreGuildSurveyModalSubmit(interaction: SurveyModalInteraction): Promise<Response> {
  const parts = interaction.data.custom_id.split(":");
  const guild = parseGuildChoice(parts[2]);
  const tag = interaction.data.components[0]?.components[0]?.value?.trim();
  const token = interaction.token;

  if (!guild || !tag) {
    return Response.json({ type: 4, data: { flags: 64, embeds: [buildSurveyErrorEmbed(RESTART_MESSAGE)] } });
  }

  after(async () => {
    try {
      await finalizeSurveyResponse(interaction.member, guild, { kind: "NEW", tag });
      await editInteractionOriginal(token, {
        embeds: [buildSurveyConfirmationEmbed(GUILD_CHOICE_LABELS[guild], `${tag} (nuevo)`)],
        components: [],
      });
    } catch (err) {
      await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
    }
  });
  return Response.json({ type: 5, data: { flags: 64 } });
}
