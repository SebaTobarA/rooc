/**
 * Función pura (sin I/O) para armar el embed del roster de composición de
 * parties — botón "Comunicar partys" del historial del Party Builder.
 * Separado de discord-event-embed.ts porque la fuente acá es un
 * PartyTemplate guardado ({players, parties}), no inscripciones en vivo a
 * un Event.
 */

import type { DiscordEmbed } from "@/lib/discord-bot";
import { JOB_ROLE_EMOJI } from "@/lib/discord-job-roles";
import type { Player, Party } from "@/types/party";

const FALLBACK_COLOR = 0x6fe0f5;

const EVENT_LABEL: Record<string, string> = {
  GUILD_LEAGUE: "Guild League",
  EMPERIUM_OVERRUN: "Emperium Overrun",
};

type EmbedField = NonNullable<DiscordEmbed["fields"]>[number];

function formatMember(player: Player): string {
  const emoji = JOB_ROLE_EMOJI[player.clase];
  return `${emoji ? `${emoji} ` : ""}${player.nickname}`;
}

function partyField(party: Party, members: Player[]): EmbedField {
  const lines = members.map(formatMember);
  return { name: party.name, value: lines.length > 0 ? lines.join("\n") : "-", inline: true };
}

function sectionHeaderField(title: string): EmbedField {
  return { name: `**${title}**`, value: "​", inline: false };
}

export function eventCategoryLabel(category: string): string {
  return EVENT_LABEL[category] ?? category;
}

/**
 * Guild League tiene parties con `campo` (Campo Principal/Secundario) —
 * ahí se arman dos secciones separadas por un field-header no inline.
 * Emperium Overrun nunca setea `campo`, así que cae en la rama simple de
 * una sola lista de parties.
 */
export function buildPartyRosterEmbed(
  eventTitle: string,
  category: string,
  players: Player[],
  parties: Party[]
): DiscordEmbed {
  const membersOf = (party: Party) => players.filter((p) => p.partyId === party.id);
  const hasCampoSplit = parties.some((p) => p.campo);

  const fields: EmbedField[] = [];

  if (hasCampoSplit) {
    const principal = parties.filter((p) => p.campo === "principal");
    const secundario = parties.filter((p) => p.campo === "secundario");
    const sinAsignar = parties.filter((p) => !p.campo);

    if (principal.length > 0) {
      fields.push(sectionHeaderField("Campo Principal"));
      principal.forEach((party) => fields.push(partyField(party, membersOf(party))));
    }
    if (secundario.length > 0) {
      fields.push(sectionHeaderField("Campo Secundario"));
      secundario.forEach((party) => fields.push(partyField(party, membersOf(party))));
    }
    if (sinAsignar.length > 0) {
      fields.push(sectionHeaderField("Sin campo asignado"));
      sinAsignar.forEach((party) => fields.push(partyField(party, membersOf(party))));
    }
  } else {
    parties.forEach((party) => fields.push(partyField(party, membersOf(party))));
  }

  return {
    title: `${eventCategoryLabel(category)}: ${eventTitle}`,
    color: FALLBACK_COLOR,
    fields,
    footer: { text: "Importante conectarse con máximo 30 min de anticipación para comunicar la estrategia." },
  };
}
