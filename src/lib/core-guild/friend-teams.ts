/**
 * Agrupa a los miembros Core marcados "en grupo" (mismo groupTag) en
 * "equipos de amigos" — pensado para la sección Amigos de /admin/core-guild,
 * donde se necesita ver a todo un equipo junto (aunque sus miembros estén
 * repartidos en varias parties, porque un equipo de más de 6 personas no
 * entra en una sola) para decidir en qué guild va cada parte, y para saber
 * cuándo ya se le puede pedir a Discord el rol del equipo.
 */

import type { CoreMember, CorePartySlot } from "./types";

export interface FriendTeam {
  // Clave normalizada (minúscula, sin espacios extra) — identifica al
  // equipo de forma estable aunque la etiqueta se re-tipee con otra
  // capitalización.
  key: string;
  // Etiqueta tal cual la escribió el admin la primera vez — se usa como
  // nombre del rol de Discord.
  name: string;
  members: CoreMember[];
  // Parties donde hay al menos un miembro de este equipo, en orden de
  // aparición.
  partyIds: string[];
  unassignedCount: number;
  // true cuando todos los miembros del equipo están asignados a alguna
  // party y esa/esas parties están todas con el candado cerrado — recién
  // ahí tiene sentido pedirle a Discord el rol del equipo.
  allLocked: boolean;
}

export function computeFriendTeams(members: CoreMember[], parties: CorePartySlot[]): FriendTeam[] {
  const partyById = new Map(parties.map((p) => [p.id, p]));
  const teams = new Map<string, FriendTeam>();

  for (const member of members) {
    if (member.groupMode !== "GROUP") continue;
    const name = member.groupTag.trim();
    if (!name) continue;
    const key = name.toLowerCase();

    let team = teams.get(key);
    if (!team) {
      team = { key, name, members: [], partyIds: [], unassignedCount: 0, allLocked: false };
      teams.set(key, team);
    }
    team.members.push(member);
    if (member.partyId) {
      if (!team.partyIds.includes(member.partyId)) team.partyIds.push(member.partyId);
    } else {
      team.unassignedCount++;
    }
  }

  for (const team of teams.values()) {
    team.allLocked =
      team.unassignedCount === 0 &&
      team.partyIds.length > 0 &&
      team.partyIds.every((id) => partyById.get(id)?.locked === true);
  }

  return [...teams.values()].sort((a, b) => b.members.length - a.members.length);
}
