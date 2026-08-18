import type { Player } from "@/types/party";
import { inferRole } from "@/lib/party/infer-role";
import type { EventRosterResult, ImportableDiscordMember } from "@/lib/party/discord-import";

function toPlayer(m: ImportableDiscordMember, campoRestriction: Player["campoRestriction"]): Player {
  return {
    id: m.discordId,
    nickname: m.nickname,
    clase: m.suggestedClass ?? "",
    rol: inferRole(m.suggestedClass ?? ""),
    partyId: null,
    campoRestriction,
  };
}

/**
 * Convierte el resultado de getEventRosterMembers en Player[] listos para
 * el pool, cada uno con la clase que tiene en Discord: los disponibles y
 * los que llegan tarde se agregan (estos últimos con restricción a Campo
 * Secundario); quien avisó que no va queda afuera del pool. Compartido
 * entre la carga automática del botón principal (guild-league.tsx /
 * emperium-overrun.tsx) y el filtro manual por rol (event-roster-import.tsx).
 */
export function rosterResultToPlayers(result: EventRosterResult): Player[] {
  return [
    ...result.available.map((m) => toPlayer(m, null)),
    ...result.lateOnly.map((m) => toPlayer(m, "secundario")),
  ];
}
