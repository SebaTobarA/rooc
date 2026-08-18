"use client";

import { useMemo } from "react";
import type { Event, EventSignup } from "@prisma/client";

export type EventWithSignups = Event & { signups: EventSignup[] };

const CHILE_TIME_ZONE = "America/Santiago";
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("es-419", {
  weekday: "long",
  timeZone: CHILE_TIME_ZONE,
});
const DAY_FORMATTER = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  timeZone: CHILE_TIME_ZONE,
});

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function dayLabel(date: Date): string {
  return `${capitalize(WEEKDAY_FORMATTER.format(date))} ${DAY_FORMATTER.format(date)}`;
}

interface WeekGroup {
  id: string;
  /** Días de esa semana que le tocan a este builder (los de su categoría). */
  days: EventWithSignups[];
}

/**
 * Elegir de qué encuesta se arma el roster, en el mismo orden en que se
 * piensa: primero el tipo (una semana completa o un evento suelto) y, si es
 * semanal, para qué día — porque el "no voy" se marca por día y el pool
 * cambia según cuál se arme.
 *
 * Cada builder solo ve los días de su categoría (Guild League muestra
 * martes y jueves; el domingo de WoE se arma en su propia pestaña), así que
 * `otherDaysHint` explica dónde está el día que falta.
 */
export function EventSurveyPicker({
  events,
  selectedEventId,
  onSelect,
  otherDaysHint,
}: {
  events: EventWithSignups[];
  selectedEventId: string;
  onSelect: (eventId: string) => void;
  otherDaysHint?: string;
}) {
  const { weeks, singles } = useMemo(() => {
    const weekMap = new Map<string, EventWithSignups[]>();
    const singleEvents: EventWithSignups[] = [];
    for (const event of events) {
      if (event.weekGroupId) {
        weekMap.set(event.weekGroupId, [...(weekMap.get(event.weekGroupId) ?? []), event]);
      } else {
        singleEvents.push(event);
      }
    }
    const weekGroups: WeekGroup[] = [...weekMap.entries()].map(([id, days]) => ({
      id,
      days: [...days].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    }));
    // Más recientes primero, igual que la consulta que las trae.
    weekGroups.sort((a, b) => b.days[0].startsAt.getTime() - a.days[0].startsAt.getTime());
    return { weeks: weekGroups, singles: singleEvents };
  }, [events]);

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const isWeekly = Boolean(selectedEvent?.weekGroupId);
  const selectedWeek = isWeekly ? weeks.find((week) => week.id === selectedEvent?.weekGroupId) ?? null : null;

  function selectType(type: "weekly" | "single") {
    if (type === "weekly") {
      const first = weeks[0];
      if (first) onSelect(first.days[0].id);
    } else if (singles[0]) {
      onSelect(singles[0].id);
    }
  }

  return (
    <div className="gl-event-picker" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <div className="import-actions">
        <button
          type="button"
          className={`btn btn-sm ${isWeekly ? "btn-primary" : "btn-secondary"}`}
          disabled={weeks.length === 0}
          onClick={() => selectType("weekly")}
        >
          Encuesta semanal
        </button>
        <button
          type="button"
          className={`btn btn-sm ${!isWeekly ? "btn-primary" : "btn-secondary"}`}
          disabled={singles.length === 0}
          onClick={() => selectType("single")}
        >
          Encuesta específica
        </button>
      </div>

      {isWeekly ? (
        <>
          {weeks.length > 1 && (
            <label className="gl-event-picker-label">
              Semana
              <select
                value={selectedWeek?.id ?? ""}
                onChange={(e) => {
                  const week = weeks.find((w) => w.id === e.target.value);
                  if (week) onSelect(week.days[0].id);
                }}
                className="gl-event-picker-select"
              >
                {weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    Semana del {DAY_FORMATTER.format(week.days[0].startsAt)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <p className="campo-hint" style={{ textAlign: "left", padding: "0 0 4px" }}>
              ¿Para qué día armas el roster? Quien avisó que no va ese día queda fuera del pool.
            </p>
            <div className="import-actions" style={{ flexWrap: "wrap" }}>
              {(selectedWeek?.days ?? []).map((day) => {
                const skipping = day.signups.filter((s) => s.status === "NOT_ATTENDING").length;
                return (
                  <button
                    key={day.id}
                    type="button"
                    className={`btn btn-sm ${day.id === selectedEventId ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => onSelect(day.id)}
                  >
                    {dayLabel(day.startsAt)}
                    {skipping > 0 ? ` (${skipping} no van)` : ""}
                  </button>
                );
              })}
            </div>
            {otherDaysHint && (
              <p className="campo-hint" style={{ textAlign: "left", padding: "4px 0 0" }}>
                {otherDaysHint}
              </p>
            )}
          </div>
        </>
      ) : (
        <label className="gl-event-picker-label">
          Evento de Discord
          <select
            value={selectedEventId}
            onChange={(e) => onSelect(e.target.value)}
            className="gl-event-picker-select"
          >
            {singles.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} — {dayLabel(event.startsAt)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
