/**
 * Función pura (sin I/O) para armar los mensajes con el roster de una
 * composición del Party Builder (ver publishTemplateRoster en
 * src/lib/actions/party-templates.ts). Separado de discord-event-embed.ts
 * porque la fuente acá es un PartyTemplate guardado, no inscripciones en
 * vivo a un Event.
 *
 * Se publica como quedó en la web: un embed por raid, en el orden de los
 * raids, y dentro de cada uno sus parties de izquierda a derecha (Discord las
 * acomoda en filas de a 3). Una party sin raid se publica como un raid
 * propio. En Guild League van primero los raids del Campo Primario.
 */

import type { DiscordEmbed } from "@/lib/discord-bot";
import { jobRoleEmoji } from "@/lib/discord-job-roles";
import type { CampoSide, Party, Player, Raid } from "@/types/party";

const FALLBACK_COLOR = 0x6fe0f5;

const EVENT_LABEL: Record<string, string> = {
  GUILD_LEAGUE: "Guild League",
  EMPERIUM_OVERRUN: "Emperium Overrun",
};

const CAMPO_LABEL: Record<CampoSide, string> = { principal: "Campo Primario", secundario: "Campo Secundario" };
const CAMPO_ORDER: (CampoSide | null)[] = ["principal", "secundario", null];

// Límites de Discord: 10 embeds y 6000 caracteres (sumando todos sus
// embeds) por mensaje, y 25 campos por embed. Se deja margen.
const MAX_EMBEDS_PER_MESSAGE = 10;
const MAX_CHARS_PER_MESSAGE = 5800;
const MAX_FIELDS_PER_EMBED = 25;

// Imagen transparente muy ancha y de 1 px de alto: obliga a Discord a darle
// a cada embed su ancho máximo, para que las parties no queden apretadas.
const SPACER_IMAGE_URL = "https://specialdelivery.vercel.app/discord/embed-ancho.png";

const FOOTER = "Importante conectarse con máximo 30 min de anticipación para comunicar la estrategia.";

type EmbedField = NonNullable<DiscordEmbed["fields"]>[number];

export function eventCategoryLabel(category: string): string {
  return EVENT_LABEL[category] ?? category;
}

function formatMember(player: Player): string {
  const emoji = jobRoleEmoji(player.clase);
  return `${emoji ? `${emoji} ` : ""}${player.nickname}`;
}

/** Los nombres de los campos de un embed ya se ven en negrita en Discord. */
function partyField(party: Party, members: Player[]): EmbedField {
  const lines = members.map(formatMember);
  return { name: party.name || "Party", value: lines.length > 0 ? lines.join("\n") : "—", inline: true };
}

function embedLength(embed: DiscordEmbed): number {
  return (
    (embed.title?.length ?? 0) +
    (embed.description?.length ?? 0) +
    (embed.footer?.text.length ?? 0) +
    (embed.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0)
  );
}

/**
 * Los mensajes a publicar, cada uno con sus embeds (normalmente es uno solo;
 * una composición muy grande se reparte en varios para no pasarse de los
 * límites de Discord).
 */
export function buildPartyRosterMessages(
  eventTitle: string,
  category: string,
  players: Player[],
  parties: Party[],
  raids: Raid[]
): DiscordEmbed[][] {
  // El orden dentro de cada party es el de la lista de jugadores guardada.
  const membersOf = (party: Party) => players.filter((player) => player.partyId === party.id);
  const raidIds = new Set(raids.map((raid) => raid.id));
  const usesCampos = parties.some((party) => party.campo) || raids.some((raid) => raid.campo);

  // Cada "bloque" es un embed: un raid con sus parties, o una party sin raid.
  const blocks: { title: string; parties: Party[] }[] = [];
  for (const campo of CAMPO_ORDER) {
    const prefix = usesCampos && campo ? `${CAMPO_LABEL[campo]} · ` : "";
    const inCampo = parties.filter((party) => (party.campo ?? null) === campo);
    for (const raid of raids.filter((candidate) => (candidate.campo ?? null) === campo)) {
      const raidParties = inCampo.filter((party) => party.raidId === raid.id);
      if (raidParties.length > 0) blocks.push({ title: `${prefix}${raid.name || "Raid"}`, parties: raidParties });
    }
    for (const party of inCampo.filter((candidate) => !candidate.raidId || !raidIds.has(candidate.raidId))) {
      blocks.push({ title: `${prefix}${party.name || "Party"}`, parties: [party] });
    }
  }

  const embeds: DiscordEmbed[] = [];
  for (const block of blocks) {
    // Un raid tiene como mucho 8 parties, pero por las dudas se parte en
    // varios embeds si se pasara del tope de campos.
    for (let start = 0; start < block.parties.length; start += MAX_FIELDS_PER_EMBED) {
      embeds.push({
        title: start === 0 ? block.title : `${block.title} (cont.)`,
        color: FALLBACK_COLOR,
        fields: block.parties.slice(start, start + MAX_FIELDS_PER_EMBED).map((party) => partyField(party, membersOf(party))),
        image: { url: SPACER_IMAGE_URL },
      });
    }
  }

  if (embeds.length === 0) {
    embeds.push({ title: "Todavía no hay parties armadas", color: FALLBACK_COLOR });
  }
  embeds[0].description = `**${eventCategoryLabel(category)}: ${eventTitle}**`;
  embeds[embeds.length - 1].footer = { text: FOOTER };

  // Se reparten en mensajes respetando los topes de Discord.
  const messages: DiscordEmbed[][] = [];
  let current: DiscordEmbed[] = [];
  let chars = 0;
  for (const embed of embeds) {
    const length = embedLength(embed);
    if (current.length > 0 && (current.length >= MAX_EMBEDS_PER_MESSAGE || chars + length > MAX_CHARS_PER_MESSAGE)) {
      messages.push(current);
      current = [];
      chars = 0;
    }
    current.push(embed);
    chars += length;
  }
  messages.push(current);
  return messages;
}
