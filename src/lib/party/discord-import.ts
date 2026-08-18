"use server";

/**
 * Importar jugadores al Party Builder a partir de un rol de Discord
 * arbitrario — generaliza el sync de Core Guild (src/lib/core-guild/sync.ts,
 * atado al rol fijo "[SD] Core") para que se pueda elegir cualquier rol del
 * server desde el builder (ver discord-role-import.tsx).
 */

import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { getGuildMembers, getGuildRoles } from "@/lib/discord-bot";
import { resolveJobFromRoles } from "@/lib/discord-job-roles";
import { prisma } from "@/lib/prisma";
import { CORE_GUILD_ROLE_ID } from "@/lib/core-guild/sync";

async function requirePartyManager() {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para importar jugadores al Party Builder.");
  }
}

export interface DiscordRoleOption {
  id: string;
  name: string;
}

export async function listGuildRolesForImport(): Promise<DiscordRoleOption[]> {
  await requirePartyManager();
  const roles = await getGuildRoles();
  return roles.map((role) => ({ id: role.id, name: role.name }));
}

export interface ImportableDiscordMember {
  discordId: string;
  nickname: string;
  username: string;
  avatarHash: string | null;
  // Clase sugerida a partir del rol de Discord del miembro, o null si no
  // tiene ninguno asignado — en ese caso el chip queda "Sin clase" y
  // editable a mano en el pool (ver player-chip.tsx).
  suggestedClass: string | null;
}

function toImportable(
  member: Awaited<ReturnType<typeof getGuildMembers>>[number],
  roles: Awaited<ReturnType<typeof getGuildRoles>>
): ImportableDiscordMember {
  return {
    discordId: member.user.id,
    nickname: member.nick ?? member.user.global_name ?? member.user.username,
    username: member.user.username,
    avatarHash: member.user.avatar,
    suggestedClass: resolveJobFromRoles(member.roles, roles),
  };
}

export async function getMembersByDiscordRole(roleId: string): Promise<ImportableDiscordMember[]> {
  await requirePartyManager();

  const [members, roles] = await Promise.all([getGuildMembers(), getGuildRoles()]);

  return members.filter((member) => member.roles.includes(roleId)).map((m) => toImportable(m, roles));
}

/**
 * Todos los miembros del server, sin filtrar por rol ni por inscripción a
 * un evento — para poder sumar a mano a cualquiera al pool del Party
 * Builder aunque no haya respondido la encuesta de asistencia (ver
 * discord-member-picker.tsx). Ordenados por nombre visible para que el
 * buscador sea predecible.
 */
export async function listAllGuildMembers(): Promise<ImportableDiscordMember[]> {
  await requirePartyManager();

  const [members, roles] = await Promise.all([getGuildMembers(), getGuildRoles()]);

  return members
    .map((m) => toImportable(m, roles))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "es"));
}

export interface EventRosterResult {
  // Sin registro en EventSignup, o CONFIRMED — se pueden arrastrar a
  // cualquier campo/party.
  available: ImportableDiscordMember[];
  // Avisaron "Llegaré tarde" — solo se pueden arrastrar a parties de Campo
  // Secundario (ver campoRestriction en types/party.ts).
  lateOnly: ImportableDiscordMember[];
  // Avisaron "No asistiré" — informativo, no se agregan al pool.
  notAttending: ImportableDiscordMember[];
  // Con qué roles se armó la lista, para poder decirlo en la interfaz
  // ("70 cargados con el rol SD1").
  roleNames: string[];
}

/**
 * El roster de un evento en modo DECLINE ("marcar inasistencia"): la misma
 * gente que ve el embed en Discord, o sea los miembros que tienen alguno de
 * los roles habilitados para responder esa encuesta (Event.allowedRoleIds —
 * si se publicó solo para SD1, acá vienen los de SD1) con la clase que
 * tienen asignada hoy en Discord. Se cruza contra EventSignup para separar
 * a quien avisó que llega tarde o que no va.
 *
 * `extraRoleIds` acota todavía más la carga (ej. una sola subdivisión
 * dentro de los roles habilitados). Los eventos publicados antes de que
 * existiera la pregunta de roles no tienen allowedRoleIds: para esos se
 * mantiene el comportamiento anterior, [SD] Core.
 */
export async function getEventRosterMembers(
  eventId: string,
  extraRoleIds: string[]
): Promise<EventRosterResult> {
  await requirePartyManager();

  const [event, members, roles, signups] = await Promise.all([
    prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: { allowedRoleIds: true } }),
    getGuildMembers(),
    getGuildRoles(),
    prisma.eventSignup.findMany({ where: { eventId } }),
  ]);

  const surveyRoleIds = event.allowedRoleIds.length > 0 ? event.allowedRoleIds : [CORE_GUILD_ROLE_ID];
  const statusByDiscordId = new Map(signups.map((s) => [s.discordId, s.status]));

  const rosterMembers = members.filter(
    (member) =>
      !member.user.bot &&
      surveyRoleIds.some((roleId) => member.roles.includes(roleId)) &&
      (extraRoleIds.length === 0 || extraRoleIds.some((roleId) => member.roles.includes(roleId)))
  );

  const result: EventRosterResult = {
    available: [],
    lateOnly: [],
    notAttending: [],
    roleNames: surveyRoleIds.map((roleId) => roles.find((role) => role.id === roleId)?.name ?? roleId),
  };
  for (const member of rosterMembers) {
    const importable = toImportable(member, roles);
    const status = statusByDiscordId.get(member.user.id);
    if (status === "NOT_ATTENDING") result.notAttending.push(importable);
    else if (status === "LATE") result.lateOnly.push(importable);
    else result.available.push(importable);
  }

  return result;
}
