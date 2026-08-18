"use client";

import { useEffect, useState } from "react";
import type { Event, EventSignup } from "@prisma/client";
import { Campo } from "@/components/party/campo";
import { RaidAssignment } from "@/components/party/raid-assignment";
import { useCampo } from "@/lib/party/use-campo";
import { signupsToPlayers } from "@/lib/party/from-signups";
import { getEventSignups } from "@/lib/actions/events";
import { getEventRosterMembers } from "@/lib/party/discord-import";
import { rosterResultToPlayers } from "@/lib/party/event-roster-players";
import { EventRosterImport } from "@/components/party/event-roster-import";
import { EventSurveyPicker } from "@/components/party/event-survey-picker";
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

  async function handleLoadEvent() {
    if (!selectedEvent) return;

    // Mismo criterio que Guild League: en modo DECLINE participa por defecto
    // todo el que podía responder la encuesta, así que se carga ese roster
    // completo con la clase que cada uno tiene en Discord, no solo a
    // quienes avisaron algo.
    if (selectedEvent.attendanceMode === "DECLINE") {
      const result = await getEventRosterMembers(selectedEvent.id, []);
      const loaded = rosterResultToPlayers(result);
      campo.addPlayers(loaded);
      const parts = [`${loaded.length} cargado(s) con ${result.roleNames.join(", ")}`];
      if (result.lateOnly.length > 0) parts.push(`${result.lateOnly.length} llegan tarde`);
      if (result.notAttending.length > 0) parts.push(`${result.notAttending.length} avisaron que no van`);
      setMsg(`${parts.join(" — ")}.`);
      setTimeout(() => setMsg(""), 4000);
      return;
    }

    campo.addPlayers(signupsToPlayers(selectedEvent.signups));
    setMsg(`${selectedEvent.signups.length} inscrito(s) cargado(s).`);
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleRefresh() {
    if (!selectedEvent) return;

    // Igual que en Guild League: en DECLINE se refresca contra el roster,
    // no contra los avisos.
    if (selectedEvent.attendanceMode === "DECLINE") {
      const result = await getEventRosterMembers(selectedEvent.id, []);
      const knownIds = new Set(campo.players.map((p) => p.id));
      const newOnes = rosterResultToPlayers(result).filter((p) => !knownIds.has(p.id));
      if (newOnes.length > 0) campo.addPlayers(newOnes);
      setMsg(newOnes.length > 0 ? `${newOnes.length} jugador(es) nuevo(s) agregado(s).` : "No hay jugadores nuevos.");
      setTimeout(() => setMsg(""), 4000);
      return;
    }

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
        <div className="gl-event-picker" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <EventSurveyPicker
            events={events}
            selectedEventId={selectedEventId}
            onSelect={setSelectedEventId}
            otherDaysHint="Martes y jueves (Guild League) se arman en la pestaña Guild League."
          />
          <div className="import-actions">
            <button type="button" className="btn btn-primary" onClick={handleLoadEvent}>
              Cargar inscritos del evento
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleRefresh}>
              Actualizar inscritos
            </button>
          </div>
        </div>
      ) : (
        <p className="campo-hint">
          Todavía no hay eventos de Emperium Overrun enviados a Discord — puedes importar jugadores a
          mano abajo.
        </p>
      )}
      {events.length > 0 && selectedEvent?.attendanceMode !== "DECLINE" && (
        <p className="campo-hint" style={{ textAlign: "left", padding: "0 0 12px" }}>
          ¿Alguien no respondió la encuesta de asistencia? Carga los inscritos y después usa &quot;Importar
          por rol de Discord&quot; más abajo para sumar al resto del rol.
        </p>
      )}

      {selectedEvent?.attendanceMode === "DECLINE" && (
        <EventRosterImport eventId={selectedEvent.id} onImport={campo.addPlayers} />
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
