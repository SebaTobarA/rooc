/**
 * Qué roles se ofrecen al publicar un evento en la pregunta "¿qué roles
 * pueden responder la encuesta?" (ver EventAudienceFields y sendEvent). La
 * lista sale en vivo del server con getGuildRoles, no de una constante, así
 * un rol nuevo aparece solo sin tocar código. Se descartan los roles
 * administrados por integraciones (bots, booster de Nitro): no se asignan a
 * mano, así que nunca sirven para filtrar quién contesta.
 */

import { getGuildRolesCached, type DiscordGuildRole } from "@/lib/discord-bot";

export interface SurveyRoleOption {
  id: string;
  name: string;
}

/** Un id de rol de Discord es un snowflake — solo dígitos. */
export function isRoleId(value: string): boolean {
  return /^\d{5,25}$/.test(value);
}

export function listSurveyRoleOptions(
  guildRoles: Pick<DiscordGuildRole, "id" | "name" | "managed">[]
): SurveyRoleOption[] {
  // getGuildRoles ya los devuelve ordenados por jerarquía del server, que es
  // el orden con el que los oficiales están acostumbrados a verlos.
  return guildRoles
    .filter((role) => !role.managed)
    .map((role) => ({ id: role.id, name: role.name }));
}

/**
 * Los roles del server listos para poblar la pregunta. Si Discord no
 * responde devuelve la lista vacía y el formulario avisa que no se pudieron
 * cargar: antes acá había una lista de respaldo con ids fijos, pero uno de
 * esos roles ya no existía en el server — mejor no ofrecer nada que ofrecer
 * un rol muerto.
 */
export async function loadSurveyRoleOptions(): Promise<SurveyRoleOption[]> {
  try {
    return listSurveyRoleOptions(await getGuildRolesCached());
  } catch {
    return [];
  }
}

/**
 * Los roles marcados en la pregunta "¿qué roles pueden responder la
 * encuesta?" — llegan repetidos bajo el mismo nombre porque son checkboxes.
 * Se validan acá aunque el formulario ya no deje enviar sin marcar ninguno:
 * una server action es un endpoint más y no puede confiar en el cliente.
 */
export function readAllowedRoleIds(formData: FormData): string[] {
  const allowedRoleIds = [
    ...new Set(
      formData
        .getAll("allowedRoleIds")
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ];
  if (allowedRoleIds.length === 0) {
    throw new Error("Elige al menos un rol habilitado para responder la encuesta.");
  }
  if (!allowedRoleIds.every(isRoleId)) {
    throw new Error("Alguno de los roles elegidos no es válido — vuelve a marcarlos.");
  }
  return allowedRoleIds;
}

/** Nombres para mostrar en el panel; los ids que ya no existen se muestran crudos. */
export function surveyRoleNames(
  roleIds: string[],
  options: Pick<SurveyRoleOption, "id" | "name">[]
): string[] {
  return roleIds.map((id) => options.find((option) => option.id === id)?.name ?? id);
}
