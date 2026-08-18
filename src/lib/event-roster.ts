/**
 * Quiénes componen el roster de un evento en modo "marcar inasistencia":
 * todos los miembros del server que tengan alguno de los roles habilitados
 * para responder la encuesta (Event.allowedRoleIds), con la clase que hoy
 * tienen asignada en Discord.
 *
 * A diferencia del modo CONFIRM, acá nadie se anota: la lista sale del
 * propio server y solo se va vaciando a medida que la gente avisa que no
 * puede ir. Por eso se lee en vivo en cada render (ver renderAndPublishEmbed)
 * y no se guarda en la base: el rol de clase puede cambiar en cualquier
 * momento, incluso desde el propio embed con el botón "Cambiar de job".
 */

import { getGuildMembers, getGuildRolesCached } from "@/lib/discord-bot";
import { resolveJobFromRoles } from "@/lib/discord-job-roles";

export interface RosterMember {
  discordId: string;
  displayName: string;
  /** Nombre canónico de la clase, o null si todavía no tiene rol de clase. */
  job: string | null;
}

export async function loadEventRoster(allowedRoleIds: string[]): Promise<RosterMember[]> {
  // Sin roles habilitados no hay a quién listar — pasa solo con eventos
  // publicados antes de que existiera la pregunta, que siguen usando el
  // embed viejo (ver renderAndPublishEmbed).
  if (allowedRoleIds.length === 0) return [];

  const [members, guildRoles] = await Promise.all([getGuildMembers(), getGuildRolesCached()]);
  const allowed = new Set(allowedRoleIds);

  return members
    .filter((member) => !member.user.bot && member.roles.some((roleId) => allowed.has(roleId)))
    .map((member) => ({
      discordId: member.user.id,
      displayName: member.nick ?? member.user.global_name ?? member.user.username,
      job: resolveJobFromRoles(member.roles, guildRoles),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
