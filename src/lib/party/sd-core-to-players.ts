import type { Player } from "@/types/party";
import { inferRole } from "@/lib/party/infer-role";
import type { ImportableDiscordMember, SdCoreImportResult } from "@/lib/party/discord-import";

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
 * Convierte el resultado de getSdCoreMembersForEvent en Player[] listos
 * para el pool: los disponibles y los que llegan tarde se agregan (estos
 * últimos con restricción a Campo Secundario); quien avisó que no va queda
 * afuera del pool. Compartido entre la carga automática del botón
 * principal (guild-league.tsx) y el import manual con subdivisión
 * (sd-core-decline-import.tsx).
 */
export function sdCoreResultToPlayers(result: SdCoreImportResult): Player[] {
  return [
    ...result.available.map((m) => toPlayer(m, null)),
    ...result.lateOnly.map((m) => toPlayer(m, "secundario")),
  ];
}
