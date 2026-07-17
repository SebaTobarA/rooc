"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";
import { Upload } from "lucide-react";
import type { Event, EventSignup } from "@prisma/client";
import { Campo } from "@/components/party/campo";
import { EventSignupPool } from "@/components/party/event-signup-pool";
import { SlotPicker } from "@/components/party/slot-picker";
import { useCampo } from "@/lib/party/use-campo";
import type { Player, SlotLabel } from "@/types/party";
import { signupsToPlayers } from "@/lib/party/from-signups";
import { readDragPayload, type DragOrigin, type DragPayload } from "@/lib/party/drag-payload";
import { getEventSignups } from "@/lib/actions/events";

const PLACEHOLDER = "Nick1,Crusader;Nick2,Wizard";

type EventWithSignups = Event & { signups: EventSignup[] };

export function GuildLeague({
  canManageParty,
  events,
}: {
  canManageParty: boolean;
  events: EventWithSignups[];
}) {
  const campo1 = useCampo(undefined, { maxPlayers: 40 });
  const campo2 = useCampo(undefined, { maxPlayers: 40 });

  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [sourcePlayers, setSourcePlayers] = useState<Player[]>([]);
  const [refreshMsg, setRefreshMsg] = useState("");

  const [raw1, setRaw1] = useState("");
  const [raw2, setRaw2] = useState("");
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [copySlots, setCopySlots] = useState(true);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  function handleLoadEvent() {
    if (!selectedEvent) return;
    setSourcePlayers(signupsToPlayers(selectedEvent.signups));
  }

  async function handleRefresh() {
    if (!selectedEvent) return;
    const fresh = await getEventSignups(selectedEvent.id);
    const freshPlayers = signupsToPlayers(fresh);
    const knownIds = new Set([
      ...sourcePlayers.map((p) => p.id),
      ...campo1.players.map((p) => p.id),
      ...campo2.players.map((p) => p.id),
    ]);
    const newOnes = freshPlayers.filter((p) => !knownIds.has(p.id));
    setRefreshMsg(
      newOnes.length > 0
        ? `${newOnes.length} inscripto(s) nuevo(s) agregado(s) al pool.`
        : "No hay inscriptos nuevos."
    );
    if (newOnes.length > 0) setSourcePlayers((prev) => [...prev, ...newOnes]);
    setTimeout(() => setRefreshMsg(""), 4000);
  }

  // Saca al jugador de donde estaba (pool de inscriptos o cualquiera de los
  // dos campos) y lo devuelve — el llamador decide dónde ponerlo después.
  function takeFrom(origin: DragOrigin, id: string): Player | undefined {
    if (origin === "source") {
      const player = sourcePlayers.find((p) => p.id === id);
      if (player) setSourcePlayers((prev) => prev.filter((p) => p.id !== id));
      return player;
    }
    if (origin === "campo1") {
      const player = campo1.players.find((p) => p.id === id);
      if (player) campo1.removePlayer(id);
      return player;
    }
    const player = campo2.players.find((p) => p.id === id);
    if (player) campo2.removePlayer(id);
    return player;
  }

  function routeDrop(payload: DragPayload, destination: DragOrigin, partyId: string | null) {
    const player = takeFrom(payload.origin, payload.id);
    if (!player) return;
    if (destination === "source") {
      setSourcePlayers((prev) => [...prev, { ...player, partyId: null }]);
    } else if (destination === "campo1") {
      campo1.addPlayers([{ ...player, partyId }]);
    } else {
      campo2.addPlayers([{ ...player, partyId }]);
    }
  }

  function handlePoolDrop(e: DragEvent) {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (payload && payload.origin !== "source") routeDrop(payload, "source", null);
  }

  function handleImport() {
    const t1 = raw1.trim();
    const t2 = raw2.trim();
    if (!t1 && !t2) return;

    let totalAdded = 0;
    const allSkipped: string[] = [];
    let r1, r2;

    if (t1) {
      r1 = campo1.importPlayers(t1);
      totalAdded += r1.added;
      allSkipped.push(...r1.skipped);
      setRaw1("");
    }
    if (t2) {
      r2 = campo2.importPlayers(t2);
      totalAdded += r2.added;
      allSkipped.push(...r2.skipped);
      setRaw2("");
    }

    const limitErrors = [r1?.limitError, r2?.limitError].filter(Boolean).join(" ");

    if (totalAdded > 0) {
      const msg = `${totalAdded} jugador(es) importado(s)${allSkipped.length ? `. Omitidos: ${allSkipped.join(", ")}` : ""}${limitErrors ? ` ⚠ ${limitErrors}` : ""}.`;
      setImportMsg({ text: msg, ok: true });
    } else if (limitErrors) {
      setImportMsg({ text: `⚠ ${limitErrors}`, ok: false });
    } else {
      setImportMsg({ text: `Sin resultados válidos. Omitidos: ${allSkipped.join(", ")}`, ok: false });
    }
    setTimeout(() => setImportMsg(null), 4000);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleImport();
  }

  function handleComps1(comps: SlotLabel[][]) {
    campo1.setCompositions(comps);
    if (copySlots) campo2.setCompositions(comps);
  }

  function handleCopySlots(checked: boolean) {
    setCopySlots(checked);
    if (checked) campo2.setCompositions(campo1.compositions);
  }

  return (
    <div className="guild-layout">
      {/* ── Inscriptos del evento de Discord ── */}
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
            Cargar inscriptos
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleRefresh}>
            Actualizar inscriptos
          </button>
        </div>
      ) : (
        <p className="campo-hint">
          Todavía no hay eventos de Guild League enviados a Discord — puedes cargar jugadores a mano
          más abajo.
        </p>
      )}
      {refreshMsg && <p className="suggest-msg">{refreshMsg}</p>}

      <EventSignupPool players={sourcePlayers} onDrop={handlePoolDrop} />

      {/* ── Importación manual (alternativa) ── */}
      <details className="import-collapse">
        <summary className="import-collapse-summary">Importar manualmente (nick, clase)</summary>
        <div className="gl-import-section">
          <p className="import-hint">
            Pega tu lista desde Excel o escribe: <code>Nick,Clase;Nick,Clase</code>
          </p>
          <div className="gl-import-grid">
            <div className="gl-import-col">
              <p className="gl-import-heading">Campo Principal (Élite)</p>
              <textarea
                className="import-textarea"
                rows={4}
                placeholder={PLACEHOLDER}
                value={raw1}
                onChange={(e) => setRaw1(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="gl-import-col">
              <p className="gl-import-heading">Campo Secundario</p>
              <textarea
                className="import-textarea"
                rows={4}
                placeholder={PLACEHOLDER}
                value={raw2}
                onChange={(e) => setRaw2(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
          <div className="import-actions">
            <button className="btn btn-primary" onClick={handleImport}>
              <Upload size={14} />
              Importar ambos campos
            </button>
          </div>
          {importMsg && (
            <p className={`import-message ${importMsg.ok ? "success" : "error"}`}>{importMsg.text}</p>
          )}
        </div>
      </details>

      {/* ── Composición Campo Principal ── */}
      <SlotPicker
        title="Composición de Party para campo principal"
        compositions={campo1.compositions}
        onChange={handleComps1}
        extraFooter={
          <label className="copy-slots-label">
            <input
              type="checkbox"
              checked={copySlots}
              onChange={(e) => handleCopySlots(e.target.checked)}
            />
            <span>Aplicar misma composición al Campo Secundario</span>
          </label>
        }
      />

      {/* ── Campo Principal ── */}
      <Campo
        label="Campo Principal (Élite)"
        campo={campo1}
        origin="campo1"
        onDropPlayer={(payload, partyId) => routeDrop(payload, "campo1", partyId)}
        showSlotsImmediately
        hideImport
        hideSlotPicker
        saveTemplate={{ event: "GUILD_LEAGUE", canManageParty, eventId: selectedEvent?.id }}
      />

      <hr className="campo-divider" />

      {/* ── Campo Secundario ── */}
      <Campo
        label="Campo Secundario"
        campo={campo2}
        origin="campo2"
        onDropPlayer={(payload, partyId) => routeDrop(payload, "campo2", partyId)}
        showSlotsImmediately
        hideImport
        hideSlotPicker={copySlots}
        saveTemplate={{ event: "GUILD_LEAGUE", canManageParty, eventId: selectedEvent?.id }}
      />
    </div>
  );
}
