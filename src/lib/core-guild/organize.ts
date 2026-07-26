/**
 * Agrupador de Core Guild — a diferencia del organizador de Overrun/
 * Emperium (src/lib/party/use-campo.ts), acá no hay composición por rol:
 * el único criterio es juntar a todo el que comparte etiqueta de grupo en
 * una sola party, y dejar a los solitarios sin asignar. Las parties ya
 * bloqueadas (candado cerrado) no se tocan, igual que antes.
 */

import type { CoreMember, CorePartySlot } from "./types";

export interface OrganizeResult {
  parties: CorePartySlot[];
  assignments: Record<string, string | null>;
}

export function organizeCoreGroups(members: CoreMember[]): OrganizeResult {
  const active = members.filter((m) => m.inCore);

  const groupsByTag = new Map<string, CoreMember[]>();
  for (const member of active) {
    const tag = member.groupMode === "GROUP" ? member.groupTag.trim() : "";
    if (!tag) continue;
    const key = tag.toLowerCase();
    const bucket = groupsByTag.get(key) ?? [];
    bucket.push(member);
    groupsByTag.set(key, bucket);
  }

  // Grupos más grandes primero, mismo criterio visual que antes.
  const ordered = [...groupsByTag.values()].sort((a, b) => b.length - a.length);
  const runId = Date.now().toString(36);

  const parties: CorePartySlot[] = [];
  const assignments: Record<string, string | null> = {};

  ordered.forEach((groupMembers, i) => {
    const party: CorePartySlot = {
      id: `core_party_${runId}_${i + 1}`,
      name: groupMembers[0].groupTag.trim(),
      capacity: groupMembers.length,
      locked: false,
    };
    parties.push(party);
    groupMembers.forEach((m) => (assignments[m.discordId] = party.id));
  });

  active.forEach((m) => {
    if (!(m.discordId in assignments)) assignments[m.discordId] = null;
  });

  return { parties, assignments };
}
