"use client";

import { useEffect, useState } from "react";
import { Save, Send } from "lucide-react";
import type { Event, EventSignup } from "@prisma/client";
import type { CampoSide, Player } from "@/types/party";
import { Campo } from "@/components/party/campo";
import { CampoAssignment } from "@/components/party/campo-assignment";
import { RaidAssignment } from "@/components/party/raid-assignment";
import { useCampo } from "@/lib/party/use-campo";
import { signupsToPlayers } from "@/lib/party/from-signups";
import { getEventSignups } from "@/lib/actions/events";
import { getEventRosterMembers } from "@/lib/party/discord-import";
import { rosterResultToPlayers } from "@/lib/party/event-roster-players";
import { DATE_FORMATTER } from "@/lib/discord-event-embed";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { EventRosterImport } from "@/components/party/event-roster-import";
import type { EditingTemplate } from "@/components/party/party-builder-app";
import {
  createPartyTemplate,
  updatePartyTemplate,
  findLatestTemplateForCategory,
  communicatePartyTemplate,
} from "@/lib/actions/party-templates";

type EventWithSignups = Event & { signups: EventSignup[] };

export function GuildLeague({
  canManageParty,
  events,
  editingTemplate,
}: {
  canManageParty: boolean;
  events: EventWithSignups[];
  editingTemplate: EditingTemplate | null;
}) {
  const campo = useCampo(undefined, { maxPlayers: 80, maxParties: 16 });
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [msg, setMsg] = useState("");

  const [lastComposition, setLastComposition] = useState<{
    id: string;
    players: Player[];
    parties: { id: string; campo: CampoSide | null }[];
  } | null>(null);

  // Si viene de "Editar" en el historial, savedTemplateId arranca apuntando
  // a esa plantilla para que "Comunicar partys" quede habilitado sin
  // necesidad de volver a guardar primero.
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(editingTemplate?.id ?? null);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [communicating, setCommunicating] = useState(false);

  // Precarga la composición guardada al entrar en modo edición — una sola
  // vez al montar, ya que PartyBuilderApp remonta este componente (key en
  // page.tsx) por cada template distinta que se abra.
  useEffect(() => {
    if (editingTemplate) campo.loadSnapshot(editingTemplate.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  async function applyLastCompositionIfMatching(loaded: Player[]) {
    const latest = await findLatestTemplateForCategory("GUILD_LEAGUE");
    if (latest) {
      const loadedIds = new Set(loaded.map((p) => p.id));
      const matchCount = latest.players.filter((p) => p.partyId && loadedIds.has(p.id)).length;
      setLastComposition(matchCount > 0 ? latest : null);
    } else {
      setLastComposition(null);
    }
  }

  async function handleLoadEvent() {
    if (!selectedEvent) return;

    // En modo DECLINE nadie tiene que "unirse": participan por defecto
    // todos los que podían responder la encuesta, así que se carga ese mismo
    // roster (con la clase que tienen en Discord) — EventSignup solo trae
    // las excepciones (llega tarde / no va).
    if (selectedEvent.attendanceMode === "DECLINE") {
      const result = await getEventRosterMembers(selectedEvent.id, []);
      const loaded = rosterResultToPlayers(result);
      campo.addPlayers(loaded);
      const parts = [`${loaded.length} cargado(s) con ${result.roleNames.join(", ")}`];
      if (result.lateOnly.length > 0) parts.push(`${result.lateOnly.length} llegan tarde (solo Campo Secundario)`);
      if (result.notAttending.length > 0) parts.push(`${result.notAttending.length} avisaron que no van`);
      setMsg(`${parts.join(" — ")}.`);
      setTimeout(() => setMsg(""), 4000);
      await applyLastCompositionIfMatching(loaded);
      return;
    }

    const loaded = signupsToPlayers(selectedEvent.signups);
    campo.addPlayers(loaded);
    setMsg(`${selectedEvent.signups.length} inscrito(s) cargado(s).`);
    setTimeout(() => setMsg(""), 4000);
    await applyLastCompositionIfMatching(loaded);
  }

  async function handleRefresh() {
    if (!selectedEvent) return;

    // En DECLINE la fuente es el roster (los signups solo traen las
    // excepciones), así que refrescar es volver a pedirlo: si no, alguien
    // que avisó "llego tarde" entraría al pool sin la restricción de Campo
    // Secundario.
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
    setMsg(
      newOnes.length > 0 ? `${newOnes.length} inscrito(s) nuevo(s) agregado(s).` : "No hay inscritos nuevos."
    );
    setTimeout(() => setMsg(""), 4000);
  }

  // Recrea la agrupación (y el campo) de la última composición guardada
  // para los inscritos actuales que coincidan por discordId y todavía no
  // tengan party asignada — no pisa ajustes manuales ya hechos.
  function handleApplyLastComposition() {
    if (!lastComposition) return;

    const groupsByOldParty = new Map<string, { campo: CampoSide | null; players: Player[] }>();
    for (const oldPlayer of lastComposition.players) {
      if (!oldPlayer.partyId) continue;
      const currentPlayer = campo.players.find((p) => p.id === oldPlayer.id);
      if (!currentPlayer || currentPlayer.partyId) continue;
      const oldParty = lastComposition.parties.find((pt) => pt.id === oldPlayer.partyId);
      if (!oldParty) continue;
      const group = groupsByOldParty.get(oldParty.id) ?? { campo: oldParty.campo, players: [] };
      group.players.push(currentPlayer);
      groupsByOldParty.set(oldParty.id, group);
    }

    const groups = Array.from(groupsByOldParty.values());
    if (groups.length === 0) {
      setMsg("Los inscritos que coinciden ya tienen party asignada — nada para aplicar.");
      setTimeout(() => setMsg(""), 4000);
      return;
    }

    const warning = campo.applySavedComposition(groups);
    setMsg(warning ?? "Composición anterior aplicada. Puedes ajustar arrastrando jugadores.");
    setTimeout(() => setMsg(""), 4000);
    setLastComposition(null);
  }

  async function handleSaveComposition() {
    const name = window.prompt(
      "Nombre de la composición:",
      editingTemplate?.name ?? selectedEvent?.title ?? "Composición de partys"
    );
    if (!name) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      if (editingTemplate) {
        await updatePartyTemplate(editingTemplate.id, name, { players: campo.players, parties: campo.parties, raids: campo.raids });
        setSaveMsg({ text: "Cambios guardados.", ok: true });
      } else {
        const template = await createPartyTemplate(
          "GUILD_LEAGUE",
          name,
          { players: campo.players, parties: campo.parties, raids: campo.raids },
          selectedEvent?.id
        );
        setSavedTemplateId(template.id);
        setSaveMsg({ text: "Composición guardada. Ya puedes comunicarla.", ok: true });
      }
    } catch (err) {
      setSaveMsg({ text: err instanceof Error ? err.message : "No se pudo guardar.", ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  async function handleCommunicate() {
    if (!savedTemplateId) return;
    setCommunicating(true);
    setSaveMsg(null);
    try {
      await communicatePartyTemplate(savedTemplateId);
      setSaveMsg({ text: "Partys comunicadas en Discord.", ok: true });
    } catch (err) {
      setSaveMsg({ text: err instanceof Error ? err.message : "No se pudo comunicar.", ok: false });
    } finally {
      setCommunicating(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
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
                  {EVENT_CATEGORY_LABEL[event.category]} {DATE_FORMATTER.format(event.startsAt)} (
                  {event.attendanceMode === "DECLINE"
                    ? `${event.signups.length} avisos`
                    : `${event.signups.length} participantes`}
                  )
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
          Todavía no hay eventos de Guild League enviados a Discord — puedes importar jugadores a mano
          abajo.
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

      {lastComposition && (
        <div className="last-composition-banner">
          <span>Hay una composición guardada anterior que coincide con algunos de estos inscritos.</span>
          <div className="last-composition-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleApplyLastComposition}>
              Usar última composición guardada
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLastComposition(null)}>
              Descartar
            </button>
          </div>
        </div>
      )}

      <Campo label="Jugadores del gremio" campo={campo} showSlotsImmediately />

      <RaidAssignment campo={campo} />

      <CampoAssignment campo={campo} />

      {canManageParty && campo.parties.length > 0 && (
        <div className="campo-actions">
          <button className="btn btn-primary" onClick={handleSaveComposition} disabled={saving}>
            <Save size={14} />
            {saving
              ? "Guardando…"
              : editingTemplate
                ? "Guardar cambios"
                : "Guardar composición de partys"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCommunicate}
            disabled={!savedTemplateId || communicating}
          >
            <Send size={14} />
            {communicating ? "Comunicando…" : "Comunicar partys"}
          </button>
        </div>
      )}
      {saveMsg && <p className={`import-message ${saveMsg.ok ? "success" : "error"}`}>{saveMsg.text}</p>}
    </div>
  );
}
