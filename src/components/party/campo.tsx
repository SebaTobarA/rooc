"use client";

import { useRef, useState, type ReactNode } from "react";
import { Wand2, FolderPlus, Sparkles, Save } from "lucide-react";
import type { UseCampoReturn } from "@/lib/party/use-campo";
import { StatsBar } from "@/components/party/stats-bar";
import { ImportBox } from "@/components/party/import-box";
import { SlotPicker } from "@/components/party/slot-picker";
import { PlayerChip } from "@/components/party/player-chip";
import { PartyCard } from "@/components/party/party-card";
import { createPartyTemplate } from "@/lib/actions/party-templates";

interface CampoProps {
  label: string;
  campo: UseCampoReturn;
  showSlotsImmediately?: boolean;
  slotPickerFooter?: ReactNode;
  onAfterImport?: () => void;
  hideImport?: boolean;
  hideSlotPicker?: boolean;
  /** Si se pasa, habilita el botón "Guardar como plantilla" para este campo. */
  saveTemplate?: { event: "GUILD_LEAGUE" | "EMPERIUM_OVERRUN"; canManageParty: boolean };
}

export function Campo({
  label,
  campo,
  showSlotsImmediately = false,
  slotPickerFooter,
  onAfterImport,
  hideImport = false,
  hideSlotPicker = false,
  saveTemplate,
}: CampoProps) {
  const {
    players,
    parties,
    compositions,
    setCompositions,
    importPlayers,
    organizeParties,
    suggestDistribution,
    assignPlayer,
    removePlayer,
    addParty,
    unassigned,
    completeCount,
    hasPlayers,
  } = campo;

  const dragIdRef = useRef<string | null>(null);
  const [organizeError, setOrganizeError] = useState("");
  const [suggestMsg, setSuggestMsg] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const showSlots = showSlotsImmediately || hasPlayers;

  function handleDragStart(id: string) {
    dragIdRef.current = id;
  }

  function handleDrop(partyId: string | null) {
    if (dragIdRef.current) {
      assignPlayer(dragIdRef.current, partyId);
      dragIdRef.current = null;
    }
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
    suggestDistribution();
    setSuggestMsg("Distribución sugerida aplicada. Puedes ajustar arrastrando jugadores.");
  }

  function handleImport(raw: string) {
    const result = importPlayers(raw);
    if (result.added > 0 && onAfterImport) onAfterImport();
    return result;
  }

  async function handleSaveTemplate() {
    if (!saveTemplate) return;
    const name = window.prompt("Nombre de la plantilla:", label || "Plantilla de party");
    if (!name) return;

    setSaving(true);
    setSaveMsg("");
    try {
      await createPartyTemplate(saveTemplate.event, name, { players, parties, compositions });
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

      {!hideImport && <ImportBox onImport={handleImport} />}

      {!hideSlotPicker && showSlots && (
        <SlotPicker compositions={compositions} onChange={setCompositions} extraFooter={slotPickerFooter} />
      )}

      {showSlots && (
        <>
          {organizeError && <p className="campo-error">{organizeError}</p>}
          <div className="campo-actions">
            <button className="btn btn-primary" onClick={handleOrganize}>
              <Wand2 size={14} />
              Organizar parties
            </button>
            <button className="btn btn-secondary" onClick={addParty}>
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
          className="player-pool"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(null)}
          role="list"
          aria-label="Jugadores sin asignar"
        >
          {unassigned.map((p) => (
            <PlayerChip key={p.id} player={p} onRemove={removePlayer} onDragStart={handleDragStart} />
          ))}
          {unassigned.length === 0 && <p className="pool-empty">Sin jugadores pendientes</p>}
        </div>
      </div>

      {parties.length > 0 && (
        <div className="parties-grid">
          {parties.map((party) => (
            <PartyCard
              key={party.id}
              party={party}
              members={players.filter((p) => p.partyId === party.id)}
              onDrop={handleDrop}
              onRemovePlayer={removePlayer}
              onDragStart={handleDragStart}
            />
          ))}
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
