"use client";

import { useState, type DragEvent } from "react";
import { Wand2, FolderPlus, Sparkles, Save } from "lucide-react";
import type { UseCampoReturn } from "@/lib/party/use-campo";
import { StatsBar } from "@/components/party/stats-bar";
import { ImportBox } from "@/components/party/import-box";
import { SlotPicker } from "@/components/party/slot-picker";
import { PlayerChip } from "@/components/party/player-chip";
import { PartyCard } from "@/components/party/party-card";
import { createPartyTemplate } from "@/lib/actions/party-templates";
import { readDragPayload } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";

interface CampoProps {
  label: string;
  campo: UseCampoReturn;
  showSlotsImmediately?: boolean;
  /** Si se pasa, habilita el botón "Guardar como plantilla" para este campo. */
  saveTemplate?: { event: "GUILD_LEAGUE" | "EMPERIUM_OVERRUN"; canManageParty: boolean; eventId?: string };
}

export function Campo({ label, campo, showSlotsImmediately = false, saveTemplate }: CampoProps) {
  const {
    players,
    parties,
    compositions,
    setCompositions,
    importPlayers,
    organizeParties,
    suggestDistribution,
    assignPlayer,
    assignPartyCampo,
    removePlayer,
    addParty,
    unassigned,
    completeCount,
    hasPlayers,
  } = campo;

  const [organizeError, setOrganizeError] = useState("");
  const [suggestMsg, setSuggestMsg] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const { selected, clearSelection } = usePlayerSelection();

  const showSlots = showSlotsImmediately || hasPlayers;
  // Parties todavía no asignadas a un campo (o, en Emperium, todas — ahí
  // `campo` nunca se setea porque no existe esa etapa).
  const stagedParties = parties.filter((p) => !p.campo);

  function handleZoneDrop(e: DragEvent, partyId: string | null) {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (!payload || payload.kind !== "player") return;
    assignPlayer(payload.id, partyId);
    clearSelection();
  }

  function handleZoneClick(partyId: string | null) {
    if (!selected || selected.kind !== "player") return;
    assignPlayer(selected.id, partyId);
    clearSelection();
  }

  // La grilla de parties sin campo también acepta que se suelte ahí una
  // party completa que estaba asignada a Campo Principal/Secundario, para
  // devolverla a la etapa "sin asignar a campo".
  function handleGridDrop(e: DragEvent) {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (!payload || payload.kind !== "party") return;
    assignPartyCampo(payload.partyId, null);
    clearSelection();
  }

  function handleGridClick() {
    if (!selected || selected.kind !== "party") return;
    assignPartyCampo(selected.partyId, null);
    clearSelection();
  }

  function handleOrganize() {
    setOrganizeError("");
    const error = organizeParties();
    if (error) setOrganizeError(error);
  }

  function handleSuggest() {
    setSuggestMsg("");
    if (!unassigned.length) {
      setSuggestMsg("No hay jugadores sin asignar.");
      return;
    }
    const warning = suggestDistribution();
    setSuggestMsg(warning ?? "Distribución sugerida aplicada. Puedes ajustar arrastrando jugadores.");
  }

  function handleAddParty() {
    setOrganizeError("");
    const error = addParty();
    if (error) setOrganizeError(error);
  }

  async function handleSaveTemplate() {
    if (!saveTemplate) return;
    const name = window.prompt("Nombre de la plantilla:", label || "Plantilla de party");
    if (!name) return;

    setSaving(true);
    setSaveMsg("");
    try {
      await createPartyTemplate(saveTemplate.event, name, { players, parties }, saveTemplate.eventId);
      setSaveMsg("Plantilla guardada.");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  }

  return (
    <div className="campo">
      {label && <h2 className="campo-label">{label}</h2>}

      <StatsBar
        players={players}
        parties={parties}
        unassignedCount={unassigned.length}
        completeCount={completeCount}
      />

      <details className="import-collapse">
        <summary className="import-collapse-summary">Importar manualmente (nick, clase)</summary>
        <ImportBox onImport={importPlayers} />
      </details>

      {showSlots && <SlotPicker compositions={compositions} onChange={setCompositions} />}

      {showSlots && (
        <>
          {organizeError && <p className="campo-error">{organizeError}</p>}
          <div className="campo-actions">
            <button className="btn btn-primary" onClick={handleOrganize}>
              <Wand2 size={14} />
              Organizar parties
            </button>
            <button className="btn btn-secondary" onClick={handleAddParty}>
              <FolderPlus size={14} />
              Nueva party
            </button>
            {saveTemplate?.canManageParty && parties.length > 0 && (
              <button className="btn btn-secondary" onClick={handleSaveTemplate} disabled={saving}>
                <Save size={14} />
                {saving ? "Guardando…" : "Guardar como plantilla"}
              </button>
            )}
          </div>
          {saveMsg && <p className="suggest-msg">{saveMsg}</p>}
        </>
      )}

      <div className="pool-section">
        <div className="pool-header">
          <span className="pool-title">Sin asignar</span>
          <button className="btn btn-ghost btn-sm" onClick={handleSuggest}>
            <Sparkles size={13} />
            Sugerir distribución
          </button>
        </div>
        {suggestMsg && <p className="suggest-msg">{suggestMsg}</p>}
        <div
          className={`player-pool ${selected?.kind === "player" ? "player-pool--armed" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleZoneDrop(e, null)}
          onClick={() => handleZoneClick(null)}
          role="list"
          aria-label="Jugadores sin asignar. Toca un jugador seleccionado para moverlo acá."
        >
          {unassigned.map((p) => (
            <PlayerChip key={p.id} player={p} onRemove={removePlayer} />
          ))}
          {unassigned.length === 0 && <p className="pool-empty">Sin jugadores pendientes</p>}
        </div>
      </div>

      {parties.length > 0 && (
        <div
          className={`parties-grid ${selected?.kind === "party" ? "parties-grid--armed" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleGridDrop}
          onClick={handleGridClick}
        >
          {stagedParties.map((party) => (
            <PartyCard
              key={party.id}
              party={party}
              members={players.filter((p) => p.partyId === party.id)}
              onDrop={handleZoneDrop}
              onClickAssign={() => handleZoneClick(party.id)}
              onRemovePlayer={removePlayer}
            />
          ))}
          {stagedParties.length === 0 && (
            <p className="pool-empty">Todas las parties fueron asignadas a un campo</p>
          )}
        </div>
      )}

      {hasPlayers && parties.length === 0 && (
        <p className="campo-hint">
          Define los roles y pulsa &quot;Organizar parties&quot; para distribuir a los jugadores.
        </p>
      )}
    </div>
  );
}
