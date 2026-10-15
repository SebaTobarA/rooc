/**
 * Carga server-only de los emojis de clase desde Discord. Separado de
 * discord-job-roles.ts porque ese módulo también lo importan componentes
 * de cliente y este usa el token del bot.
 */

import { getGuildEmojisCached } from "@/lib/discord-bot";
import { JOB_ROLE_EMOJI, JOB_ROLE_NAMES, matchJobRoleEmojis } from "@/lib/discord-job-roles";

/**
 * Carga los emojis de clase desde Discord (cache de 5 min) y actualiza
 * JOB_ROLE_EMOJI en el lugar. Nunca lanza: si Discord falla, los embeds
 * se publican igual, sin íconos o con los últimos conocidos.
 */
export async function loadJobRoleEmojis(): Promise<Record<string, string>> {
  try {
    const matched = matchJobRoleEmojis(await getGuildEmojisCached());
    for (const key of Object.keys(JOB_ROLE_EMOJI)) delete JOB_ROLE_EMOJI[key];
    Object.assign(JOB_ROLE_EMOJI, matched);
    const missing = JOB_ROLE_NAMES.filter((job) => !matched[job]);
    if (missing.length > 0) console.warn(`[job-emojis] Sin emoji en el server para: ${missing.join(", ")}`);
  } catch (err) {
    console.warn("[job-emojis] No se pudieron cargar los emojis del server:", err);
  }
  return JOB_ROLE_EMOJI;
}
