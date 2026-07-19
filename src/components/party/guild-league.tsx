"use client";

import { useState } from "react";
import { Save, Send } from "lucide-react";
import type { Event, EventSignup } from "@prisma/client";
import type { CampoSide, Player } from "@/types/party";
import { Campo } from "@/components/party/campo";
import { CampoAssignment } from "@/components/party/campo-assignment";
import { useCampo } from "@/lib/party/use-campo";
import { signupsToPlayers } from "@/lib/party/from-signups";
import { getEventSignups } from "@/lib/actions/events";
import {
  createPartyTemplate,
  findLatestTemplateForCategory,
  communicatePartyTemplate,
} from "@/lib/actions/party-templates";

type EventWithSignups = Event & { signups: EventSignup[] };

export function GuildLeague({
  canManageParty,
  events,
}: {
  canManageParty: boolean;
  events: EventWithSignups[];
}) {
  const campo = useCampo(undefined, { maxPlayers: 80, maxParties: 16 });
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [msg, setMsg] = useState("");

  const [lastComposition, setLastComposition] = useState<{
    id: string;
    players: Player[];
    parties: { id: string; campo: CampoSide | null }[];
  } | null>(null);

  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [communicating, setCommunicating] = useState(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  async function handleLoadEvent() {
    if (!selectedEvent) return;
    const loaded = signupsToPlayers(selectedEvent.signups);
    campo.addPlayers(loaded);
    setMsg(`${selectedEvent.signups.length} inscrito(s) cargado(s).`);
    setTimeout(() => setMsg(""), 4000);

    const latest = await findLatestTemplateForCategory("GUILD_LEAGUE");
    if (latest) {
      const loadedIds = new Set(loaded.map((p) => p.id));
      const matchCount = latest.players.filter((p) => p.partyId && loadedIds.has(p.id)).length;
      setLastComposition(matchCount > 0 ? latest : null);
    } else {
      setLastComposition(null);
    }
  }

  async function handleRefresh() {
    if (!selectedEvent) return;
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
    const name = window.prompt("Nombre de la composición:", selectedEvent?.title ?? "Composición de partys");
    if (!name) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const template = await createPartyTemplate(
        "GUILD_LEAGUE",
        name,
        { players: campo.players, parties: campo.parties },
        selectedEvent?.id
      );
      setSavedTemplateId(template.id);
      setSaveMsg({ text: "Composición guardada. Ya puedes comunicarla.", ok: true });
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
          Todavía no hay eventos de Guild League enviados a Discord — puedes importar jugadores a mano
          abajo.
        </p>
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

      <CampoAssignment campo={campo} />

      {canManageParty && campo.parties.length > 0 && (
        <div className="campo-actions">
          <button className="btn btn-primary" onClick={handleSaveComposition} disabled={saving}>
            <Save size={14} />
            {saving ? "Guardando…" : "Guardar composición de partys"}
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
