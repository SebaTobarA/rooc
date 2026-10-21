/**
 * Cruce entre la composición permanente y la encuesta de asistencia del
 * próximo evento de ese tipo: sirve para controlar quién de la composición
 * avisó que juega. No cambia la composición, solo la marca.
 */

import type { EventAttendanceMode, EventSignupStatus } from "@prisma/client";

export type AttendanceTone = "ok" | "late" | "no" | "unknown";

export interface AttendanceMark {
  tone: AttendanceTone;
  label: string;
}

/**
 * En modo CONFIRM hay que apretar "Participar" para quedar anotado: sin
 * respuesta no se sabe si juega. En modo DECLINE todos participan por
 * defecto y solo se avisa si se llega tarde o no se puede ir.
 */
export function attendanceMark(mode: EventAttendanceMode, status: EventSignupStatus | null | undefined): AttendanceMark {
  if (status === "NOT_ATTENDING") return { tone: "no", label: "No juega" };
  if (status === "LATE") return { tone: "late", label: "Llega tarde" };
  if (status === "CONFIRMED") return { tone: "ok", label: "Juega" };
  return mode === "DECLINE" ? { tone: "ok", label: "Juega (no avisó falta)" } : { tone: "unknown", label: "Sin responder" };
}

export const ATTENDANCE_DOT_CLASS: Record<AttendanceTone, string> = {
  ok: "bg-emerald-400",
  late: "bg-amber-400",
  no: "bg-rose-500",
  unknown: "bg-zinc-500",
};

export const ATTENDANCE_TEXT_CLASS: Record<AttendanceTone, string> = {
  ok: "text-emerald-400",
  late: "text-amber-400",
  no: "text-rose-400",
  unknown: "text-muted",
};
