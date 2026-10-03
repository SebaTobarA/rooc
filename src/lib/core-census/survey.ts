/**
 * Cómo se lee la respuesta de un jugador a la encuesta de asistencia de
 * Discord (EventSignup) según el modo del evento: en "marcar inasistencia"
 * no responder significa que va; en "confirmar asistencia" significa que no
 * respondió.
 */

import type { EventAttendanceMode, EventSignupStatus } from "@prisma/client";

export type SurveyTone = "ok" | "warn" | "bad" | "muted";

export function surveyAnswer(
  status: EventSignupStatus | null,
  mode: EventAttendanceMode
): { label: string; tone: SurveyTone } {
  if (status === "CONFIRMED") return { label: "Confirmó", tone: "ok" };
  if (status === "LATE") return { label: "Avisó: llega tarde", tone: "warn" };
  if (status === "NOT_ATTENDING") return { label: "Avisó: no asiste", tone: "warn" };
  return mode === "DECLINE"
    ? { label: "Sin aviso (asiste)", tone: "muted" }
    : { label: "No respondió", tone: "bad" };
}

export const SURVEY_TONE_CLASS: Record<SurveyTone, string> = {
  ok: "text-emerald-400",
  warn: "text-sky-400",
  bad: "text-rose-400",
  muted: "text-muted",
};
