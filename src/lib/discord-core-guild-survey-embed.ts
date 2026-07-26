/**
 * Funciones puras (sin I/O) para armar el embed y los componentes de cada
 * paso de la encuesta de organización de Core Guild — mismo espíritu que
 * discord-event-embed.ts, separado de survey-interactions.ts (que sí hace
 * I/O) para no mezclar formato con lógica de red.
 *
 * Todo el estado entre pasos viaja en el custom_id, con el prefijo "cgs:"
 * (Core Guild Survey) para que el endpoint de interacciones lo distinga de
 * los custom_id de eventos (ver discord-event-embed.ts/parseCustomId).
 */

import type {
  DiscordActionRow,
  DiscordButton,
  DiscordEmbed,
  DiscordModal,
  DiscordSelectMenu,
} from "@/lib/discord-bot";
import { GUILD_CHOICE_LABELS, GUILD_CHOICE_OPTIONS } from "@/lib/core-guild/guild-choice";
import type { GuildChoice } from "@/lib/core-guild/types";
import type { ExistingGroup } from "@/lib/core-guild/survey-groups";

const MAX_SELECT_OPTIONS = 25;

function button(label: string, style: 1 | 2 | 3 | 4, customId: string): DiscordButton {
  return { type: 2, style, label, custom_id: customId };
}

function row(...components: DiscordActionRow["components"]): DiscordActionRow {
  return { type: 1, components };
}

export const NOT_IN_GUILD_MESSAGE =
  'Por favor en Guild busca "Spc" en el buscador de Guild y apuntate a SD3 de Petirrojo o a SD4 de Escuditto mientras se hacen las plazas.';

export function buildSurveyStartEmbed(): DiscordEmbed {
  return {
    title: "📋 Organización de grupos — Core Guild",
    description:
      "Antes de armar los equipos necesitamos saber en qué guild estás y con quién venís.\n\n¿Estás en una de las Guild?",
    color: 0x6fe0f5,
  };
}

export function buildAreYouInGuildComponents(): DiscordActionRow[] {
  return [row(button("Sí", 3, "cgs:guild:y"), button("No", 4, "cgs:guild:n"))];
}

export function buildGuildSelectComponents(): DiscordActionRow[] {
  const select: DiscordSelectMenu = {
    type: 3,
    custom_id: "cgs:guildsel",
    placeholder: "Elegí tu guild…",
    options: GUILD_CHOICE_OPTIONS.map((choice) => ({ label: GUILD_CHOICE_LABELS[choice], value: choice })),
  };
  return [row(select)];
}

export function buildFriendGroupQuestionComponents(guild: GuildChoice): DiscordActionRow[] {
  return [
    row(
      button("Sí", 3, `cgs:fr:y:${guild}`),
      button("No", 2, `cgs:fr:n:${guild}`),
      button("Mi grupo no está", 1, `cgs:fr:new:${guild}`)
    ),
  ];
}

export function buildExistingGroupSelectComponents(guild: GuildChoice, groups: ExistingGroup[]): DiscordActionRow[] {
  const select: DiscordSelectMenu = {
    type: 3,
    custom_id: `cgs:groupsel:${guild}`,
    placeholder: "Elegí tu grupo…",
    options: groups
      .slice(0, MAX_SELECT_OPTIONS)
      .map((g) => ({ label: `${g.tag} (${g.count})`, value: g.tag, description: `${g.count} persona(s)` })),
  };
  return [row(select)];
}

export function buildNewGroupModal(guild: GuildChoice): DiscordModal {
  return {
    custom_id: `cgs:newgroup:${guild}`,
    title: "Nombre de tu grupo de amigos",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "name",
            label: "Nombre del grupo",
            style: 1,
            required: true,
            max_length: 40,
            placeholder: "Ej. Pizza",
          },
        ],
      },
    ],
  };
}
