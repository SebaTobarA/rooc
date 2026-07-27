/**
 * Forma de la composición guardada en PartyTemplate.data y su parser.
 *
 * Vive fuera de src/lib/actions/party-templates.ts a propósito: ese archivo
 * es "use server" y Next.js exige que TODO lo que exporte sea una función
 * async, así que un helper síncrono como readSnapshot rompe el build de
 * producción si se exporta desde ahí (el type-check de TypeScript no lo
 * detecta, solo `next build`).
 */

import type { Player, Party, Raid } from "@/types/party";

export interface PartyTemplateSnapshot {
  players: Player[];
  parties: Party[];
  // Los raids a los que pertenecen esas parties (ver Party.raidId). Las
  // plantillas guardadas antes de que existieran los raids no lo traen —
  // readSnapshot las normaliza a [].
  raids: Raid[];
}

export function readSnapshot(data: unknown): PartyTemplateSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const players = (data as { players?: unknown }).players;
  const parties = (data as { parties?: unknown }).parties;
  const raids = (data as { raids?: unknown }).raids;
  if (!Array.isArray(players) || !Array.isArray(parties)) return null;
  return {
    players: players as Player[],
    parties: parties as Party[],
    raids: Array.isArray(raids) ? (raids as Raid[]) : [],
  };
}
