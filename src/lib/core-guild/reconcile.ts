/**
 * Mezcla el roster fresco de Discord con lo último guardado — usado tanto
 * por el board de admin (use-core-guild-board.ts, al montar) como por el
 * snapshot en vivo de Miembros Core (actions/core-guild-members.ts, en
 * cada poll), para que ambos reconcilien exactamente igual.
 *
 * Los miembros ya guardados conservan sus campos editables (jobRole,
 * grupo/etiqueta, wallet, guildChoice, party), solo se refrescan nick/
 * avatar; los que aparecen nuevos en Discord se agregan con valores por
 * defecto; los que ya no tienen el rol Core quedan marcados
 * `inCore: false` en vez de desaparecer, para que el admin decida a mano
 * si los saca.
 */

import type { CoreGuildRosterEntry } from "./sync";
import type { CoreMember } from "./types";

export function reconcileMembers(roster: CoreGuildRosterEntry[], saved: CoreMember[]): CoreMember[] {
  const savedById = new Map(saved.map((m) => [m.discordId, m]));
  const rosterIds = new Set(roster.map((r) => r.discordId));

  const merged: CoreMember[] = roster.map((entry) => {
    const existing = savedById.get(entry.discordId);
    if (existing) {
      return {
        ...existing,
        username: entry.username,
        globalName: entry.globalName,
        nick: entry.nick,
        avatarHash: entry.avatarHash,
        inCore: true,
        // `guildChoice` no existía en boards guardados antes de la encuesta.
        guildChoice: existing.guildChoice ?? null,
      };
    }
    return {
      discordId: entry.discordId,
      username: entry.username,
      globalName: entry.globalName,
      nick: entry.nick,
      avatarHash: entry.avatarHash,
      jobRole: entry.suggestedJobRole ?? "",
      groupMode: "SOLO" as const,
      groupTag: "",
      walletType: "F2P" as const,
      inCore: true,
      partyId: null,
      guildChoice: null,
    };
  });

  saved.forEach((m) => {
    if (!rosterIds.has(m.discordId)) merged.push({ ...m, inCore: false });
  });

  return merged;
}
