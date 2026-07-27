"use client";

import { useEffect, useState } from "react";
import type { Event, EventSignup } from "@prisma/client";
import { Campo } from "@/components/party/campo";
import { RaidAssignment } from "@/components/party/raid-assignment";
import { useCampo } from "@/lib/party/use-campo";
import { signupsToPlayers } from "@/lib/party/from-signups";
import { getEventSignups } from "@/lib/actions/events";
import type { EditingTemplate } from "@/components/party/party-builder-app";

type EventWithSignups = Event & { signups: EventSignup[] };

export function EmperiumOverrun({
  canManageParty,
  events,
  editingTemplate,
}: {
  canManageParty: boolean;
  events: EventWithSignups[];
  editingTemplate: EditingTemplate | null;
}) {
  const campo = useCampo(undefined, { minPlayers: 20 });
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [msg, setMsg] = useState("");

  // Precarga la composición guardada al entrar en modo edición — una sola
  // vez al montar (ver mismo patrón en guild-league.tsx).
  useEffect(() => {
    if (editingTemplate) campo.loadSnapshot(editingTemplate.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  function handleLoadEvent() {
    if (!selectedEvent) return;
    campo.addPlayers(signupsToPlayers(selectedEvent.signups));
    setMsg(`${selectedEvent.signups.length} inscrito(s) cargado(s).`);
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleRefresh() {
    if (!selectedEvent) return;
    const fresh = await getEventSignups(selectedEvent.id);
    const knownIds = new Set(campo.players.map((p) => p.id));
    const newOnes = signupsToPlayers(fresh).filter((p) => !knownIds.has(p.id));
    if (newOnes.length > 0) campo.addPlayers(newOnes);
    setMsg(newOnes.length > 0 ? `${newOnes.length} inscrito(s) nuevo(s) agregado(s).` : "No hay inscritos nuevos.");
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
                  {event.title} ({event.signups.length} inscritos)
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={handleLoadEvent}>
            Cargar inscritos del evento
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleRefresh}>
            Actualizar inscritos
          </button>
        </div>
      ) : (
        <p className="campo-hint">
          Todavía no hay eventos de Emperium Overrun enviados a Discord — puedes importar jugadores a
          mano abajo.
        </p>
      )}
      {events.length > 0 && (
        <p className="campo-hint" style={{ textAlign: "left", padding: "0 0 12px" }}>
          ¿Alguien no respondió la encuesta de asistencia? Carga los inscritos y después usa &quot;Importar
          por rol de Discord&quot; más abajo para sumar al resto del rol.
        </p>
      )}
      {msg && <p className="suggest-msg">{msg}</p>}

      <Campo
        label="Jugadores del gremio"
        campo={campo}
        showSlotsImmediately
        saveTemplate={{
          event: "EMPERIUM_OVERRUN",
          canManageParty,
          eventId: selectedEvent?.id,
          editingTemplateId: editingTemplate?.id,
          editingTemplateName: editingTemplate?.name,
        }}
      />

      <RaidAssignment campo={campo} />
    </div>
  );
}
