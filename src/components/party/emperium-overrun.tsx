"use client";

import { useState } from "react";
import type { Event, EventSignup } from "@prisma/client";
import { Campo } from "@/components/party/campo";
import { useCampo } from "@/lib/party/use-campo";
import { signupsToPlayers } from "@/lib/party/from-signups";
import { getEventSignups } from "@/lib/actions/events";

type EventWithSignups = Event & { signups: EventSignup[] };

export function EmperiumOverrun({
  canManageParty,
  events,
}: {
  canManageParty: boolean;
  events: EventWithSignups[];
}) {
  const campo = useCampo(undefined, { minPlayers: 20 });
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [msg, setMsg] = useState("");

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  function handleLoadEvent() {
    if (!selectedEvent) return;
    campo.addPlayers(signupsToPlayers(selectedEvent.signups));
    setMsg(`${selectedEvent.signups.length} inscripto(s) cargado(s).`);
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleRefresh() {
    if (!selectedEvent) return;
    const fresh = await getEventSignups(selectedEvent.id);
    const knownIds = new Set(campo.players.map((p) => p.id));
    const newOnes = signupsToPlayers(fresh).filter((p) => !knownIds.has(p.id));
    if (newOnes.length > 0) campo.addPlayers(newOnes);
    setMsg(newOnes.length > 0 ? `${newOnes.length} inscripto(s) nuevo(s) agregado(s).` : "No hay inscriptos nuevos.");
    setTimeout(() => setMsg(""), 4000);
  }

  return (
    <div className="event-layout">
      {events.length > 0 ? (
        <div className="gl-event-picker">
          <label className="gl-event-picker-label">
            Evento de Discord
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="gl-event-picker-select"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({event.signups.length} inscriptos)
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={handleLoadEvent}>
            Cargar inscriptos del evento
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleRefresh}>
            Actualizar inscriptos
          </button>
        </div>
      ) : (
        <p className="campo-hint">
          Todavía no hay eventos de Emperium Overrun enviados a Discord — podés importar jugadores a
          mano abajo.
        </p>
      )}
      {msg && <p className="suggest-msg">{msg}</p>}

      <Campo
        label="Jugadores del gremio"
        campo={campo}
        origin="campo1"
        onDropPlayer={(payload, partyId) => campo.assignPlayer(payload.id, partyId)}
        showSlotsImmediately
        saveTemplate={{ event: "EMPERIUM_OVERRUN", canManageParty, eventId: selectedEvent?.id }}
      />
    </div>
  );
}
