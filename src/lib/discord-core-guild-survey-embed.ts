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
import { truncateFieldValue } from "@/lib/discord-event-embed";
import type { CoreMember, GuildChoice } from "@/lib/core-guild/types";
import type { CoreGuildRosterEntry } from "@/lib/core-guild/sync";
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

const SURVEY_COLOR = 0x6fe0f5;
const SUCCESS_COLOR = 0x57f287;
const ERROR_COLOR = 0xed4245;

function memberDisplayName(m: Pick<CoreMember, "nick" | "globalName" | "username">): string {
  return m.nick ?? m.globalName ?? m.username;
}

/** Línea "**Tag (n)**: nombre1, nombre2..." por cada grupo dentro de una guild, más una línea "Solo (n)" al final si corresponde. */
function buildGuildFieldValue(members: CoreMember[], guild: GuildChoice): string {
  const inGuild = members.filter((m) => m.guildChoice === guild);
  if (inGuild.length === 0) return "-";

  const groups = new Map<string, CoreMember[]>();
  const solo: CoreMember[] = [];
  for (const member of inGuild) {
    const tag = member.groupMode === "GROUP" ? member.groupTag.trim() : "";
    if (tag) {
      const bucket = groups.get(tag) ?? [];
      bucket.push(member);
      groups.set(tag, bucket);
    } else {
      solo.push(member);
    }
  }

  const lines = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([tag, bucket]) => `**${tag} (${bucket.length})**: ${bucket.map(memberDisplayName).join(", ")}`);
  if (solo.length > 0) lines.push(`**Solo (${solo.length})**: ${solo.map(memberDisplayName).join(", ")}`);

  return truncateFieldValue(lines);
}

/**
 * Embed público de la encuesta — se publica una sola vez y se edita cada
 * vez que alguien responde (ver survey-roster.ts), para que todos vean en
 * vivo quién ya se anotó en cada guild/grupo y a quién le falta responder.
 */
export function buildSurveyRosterEmbed(members: CoreMember[], coreRoster: CoreGuildRosterEntry[]): DiscordEmbed {
  const respondedIds = new Set(members.filter((m) => m.guildChoice).map((m) => m.discordId));
  const missing = coreRoster.filter((r) => !respondedIds.has(r.discordId));

  const fields = GUILD_CHOICE_OPTIONS.map((guild) => ({
    name: `${GUILD_CHOICE_LABELS[guild]} (${members.filter((m) => m.guildChoice === guild).length})`,
    value: buildGuildFieldValue(members, guild),
  }));

  fields.push({
    name: `Faltan por responder (${missing.length})`,
    value: truncateFieldValue(missing.map((r) => r.nick ?? r.globalName ?? r.username)),
  });

  return {
    title: "📋 Organización de grupos — Core Guild",
    description:
      "Antes de armar los equipos necesitamos saber en qué guild estás y con quién venís.\n\n¿Estás en una de las Guild?",
    color: SURVEY_COLOR,
    fields,
    footer: { text: `${respondedIds.size} respondieron · ${missing.length} faltan` },
  };
}

/** Embed genérico para los pasos intermedios (pregunta simple, sin campos). */
export function buildSurveyStepEmbed(description: string): DiscordEmbed {
  return { description, color: SURVEY_COLOR };
}

export function buildSurveyErrorEmbed(description: string): DiscordEmbed {
  return { description, color: ERROR_COLOR };
}

export function buildSurveyConfirmationEmbed(guildLabel: string, groupLabel: string): DiscordEmbed {
  return {
    title: "✅ Registro completado",
    color: SUCCESS_COLOR,
    fields: [
      { name: "Guild", value: guildLabel, inline: true },
      { name: "Grupo", value: groupLabel, inline: true },
    ],
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
