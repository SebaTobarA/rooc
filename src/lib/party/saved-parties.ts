/**
 * Parties guardadas del Party Builder (SavedParty): grupos de jugadores con
 * afinidad que se reutilizan al armar composiciones nuevas o campos, en
 * Guild League y en Emperium Overrun. Este archivo es puro (lo usan el
 * servidor y el cliente); la lectura de la base está en loadSavedParties.
 */

import type { DraftPerson } from "@/lib/party/draft-ops";
import { PARTY_SIZE } from "@/lib/party/draft-ops";

export interface SavedPartyPlayer extends DraftPerson {
  /** discordId */
  id: string;
}

export interface SavedPartyView {
  id: string;
  name: string;
  players: SavedPartyPlayer[];
  updatedByName: string | null;
  updatedAt: string;
}

/** Lee la lista de jugadores guardada en SavedParty.players; descarta lo que no tenga forma. */
export function readSavedPartyPlayers(data: unknown): SavedPartyPlayer[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (item): item is SavedPartyPlayer =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as SavedPartyPlayer).id === "string" &&
        typeof (item as SavedPartyPlayer).nickname === "string" &&
        typeof (item as SavedPartyPlayer).clase === "string"
    )
    .slice(0, PARTY_SIZE)
    .map(({ id, nickname, clase }) => ({ id, nickname, clase }));
}
