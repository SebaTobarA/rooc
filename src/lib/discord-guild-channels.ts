/**
 * Canales de Discord donde se puede comunicar un evento (Guild League /
 * Emperium Overrun) y el rol requerido para poder anotarse en cada uno —
 * todos son visibles para cualquiera del server, pero solo puede tocar los
 * botones de asistencia quien tenga el rol de la guild correspondiente (ver
 * /admin/core-guild, donde se le asigna a cada miembro el rol de su guild:
 * [SD] Core para la guild principal, o el rol propio de SD2/SD3).
 */

import { CORE_GUILD_ROLE_ID } from "@/lib/core-guild/sync";

export interface EventChannelOption {
  id: string;
  label: string;
  requiredRoleId: string;
}

export const EVENT_CHANNEL_OPTIONS: EventChannelOption[] = [
  { id: "1519127820847026256", label: "Asistencia", requiredRoleId: CORE_GUILD_ROLE_ID },
  { id: "1531006103561965792", label: "Asistencia SD2", requiredRoleId: "1530393959937998999" },
  { id: "1531006144569413774", label: "Asistencia SD3", requiredRoleId: "1530394033245913088" },
];

export function requiredRoleForChannel(channelId: string): string | null {
  return EVENT_CHANNEL_OPTIONS.find((option) => option.id === channelId)?.requiredRoleId ?? null;
}
