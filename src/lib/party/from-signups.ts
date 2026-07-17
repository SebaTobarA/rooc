import type { EventSignup } from "@prisma/client";
import type { Player } from "@/types/party";
import { inferRole, normalizeClass } from "@/lib/party/infer-role";

/**
 * Convierte inscripciones a un evento de Discord en Player[] listos para el
 * Party Builder — mismo shape que produce importPlayers() al pegar texto,
 * pero la fuente es el signup real (clase que la persona confirmó en
 * Discord), no texto tipeado a mano. discordId es único dentro de un mismo
 * evento (@@unique([eventId, discordId])), así que sirve como Player.id.
 */
export function signupsToPlayers(
  signups: Pick<EventSignup, "discordId" | "displayName" | "className" | "status">[]
): Player[] {
  return signups
    .filter((signup) => signup.status !== "NOT_ATTENDING")
    .map((signup) => {
      const clase = normalizeClass(signup.className);
      return {
        id: signup.discordId,
        nickname: signup.displayName,
        clase,
        rol: inferRole(clase),
        partyId: null,
      };
    });
}
