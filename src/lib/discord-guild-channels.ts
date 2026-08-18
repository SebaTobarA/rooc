/**
 * Canales de Discord donde se puede comunicar un evento (Guild League /
 * Emperium Overrun). El canal solo dice dónde se publica: quién puede
 * responder la encuesta se elige aparte, al enviar el evento (ver
 * Event.allowedRoleIds y EventAudienceFields).
 */

export interface EventChannelOption {
  id: string;
  label: string;
}

export const EVENT_CHANNEL_OPTIONS: EventChannelOption[] = [
  { id: "1519127820847026256", label: "Asistencia" },
  { id: "1531006103561965792", label: "Asistencia SD2" },
  { id: "1531006144569413774", label: "Asistencia SD3" },
];

/** Canal donde se publica la encuesta de organización de grupos de amigos (ver survey-interactions.ts). */
export const CORE_GUILD_SURVEY_CHANNEL_ID = "1520965675903090732";
