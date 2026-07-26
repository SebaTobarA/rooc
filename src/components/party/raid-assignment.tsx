"use client";

import { useState, type DragEvent } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import type { UseCampoReturn } from "@/lib/party/use-campo";
import { PartyCard } from "@/components/party/party-card";
import { SlotPicker } from "@/components/party/slot-picker";
import { readDragPayload } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";

const MAX_PARTIES_PER_RAID = 8;

function RaidColumn({ raidId, campo }: { raidId: string; campo: UseCampoReturn }) {
  const {
    raids,
    players,
    parties,
    assignPlayer,
    assignPartyToRaid,
    updateRaidName,
    updateRaidCompositions,
    removeRaid,
    organizeRaid,
    removePlayer,
  } = campo;
  const { selected, clearSelection } = usePlayerSelection();
  const [error, setError] = useState("");
  const [organizeMsg, setOrganizeMsg] = useState("");

  const raid = raids.find((r) => r.id === raidId);
  if (!raid) return null;

  const partiesInRaid = parties.filter((p) => p.raidId === raidId);
  const isPartyArmed = selected?.kind === "party";

  function handleColumnDrop(e: DragEvent) {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (!payload || payload.kind !== "party") return;
    const err = assignPartyToRaid(payload.partyId, raidId);
    setError(err ?? "");
    if (!err) clearSelection();
    if (err) setTimeout(() => setError(""), 4000);
  }

  function handleColumnClick() {
    if (!selected || selected.kind !== "party") return;
    const err = assignPartyToRaid(selected.partyId, raidId);
    setError(err ?? "");
    if (!err) clearSelection();
    if (err) setTimeout(() => setError(""), 4000);
  }

  function handlePlayerDrop(e: DragEvent, partyId: string) {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (!payload || payload.kind !== "player") return;
    assignPlayer(payload.id, partyId);
    clearSelection();
  }

  function handlePlayerClickAssign(partyId: string) {
    if (!selected || selected.kind !== "player") return;
    assignPlayer(selected.id, partyId);
    clearSelection();
  }

  function handleOrganize() {
    setOrganizeMsg("");
    const err = organizeRaid(raidId);
    setOrganizeMsg(err ?? "Parties armadas para este raid.");
    setTimeout(() => setOrganizeMsg(""), 5000);
  }

  return (
    <div className="campo-column raid-column">
      <div className="campo-column-header">
        <input
          className="raid-name-input"
          defaultValue={raid.name}
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value) updateRaidName(raidId, value);
          }}
          aria-label={`Nombre de ${raid.name}`}
        />
        <span className="campo-column-count">
          {partiesInRaid.length}/{MAX_PARTIES_PER_RAID} parties
        </span>
        <button
          type="button"
          className="chip-remove"
          onClick={() => removeRaid(raidId)}
          aria-label={`Eliminar ${raid.name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <details className="import-collapse">
        <summary className="import-collapse-summary">Composición de {raid.name}</summary>
        <SlotPicker compositions={raid.compositions} onChange={(c) => updateRaidCompositions(raidId, c)} />
      </details>

      <div className="campo-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleOrganize}>
          <Wand2 size={13} />
          Organizar este raid
        </button>
      </div>
      {organizeMsg && <p className="suggest-msg">{organizeMsg}</p>}
      {error && <p className="campo-error">{error}</p>}

      <div
        className={`campo-column-drop ${isPartyArmed ? "campo-column-drop--armed" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleColumnDrop}
        onClick={handleColumnClick}
        role="list"
        aria-label={`${raid.name}. Toca una party seleccionada para asignarla acá.`}
      >
        {partiesInRaid.map((party) => (
          <PartyCard
            key={party.id}
            party={party}
            members={players.filter((p) => p.partyId === party.id)}
            onDrop={handlePlayerDrop}
            onClickAssign={() => handlePlayerClickAssign(party.id)}
            onRemovePlayer={removePlayer}
            compact
          />
        ))}
        {partiesInRaid.length === 0 && (
          <p className="pool-empty">Arrastra o toca una party para asignarla acá</p>
        )}
      </div>
    </div>
  );
}

/**
 * Armador de raids de Emperium Overrun — a diferencia de Guild League (dos
 * campos fijos), acá los raids se crean a demanda (mínimo 1, sin máximo) y
 * cada uno tiene su propia composición de party. Las parties arrancan en
 * el grid "sin asignar" de <Campo> y se arrastran (o tocan) hacia el raid
 * que corresponda, con el mismo tope de 8 parties por raid.
 */
export function RaidAssignment({ campo }: { campo: UseCampoReturn }) {
  const { raids, addRaid } = campo;
  const [newRaidName, setNewRaidName] = useState("");

  function handleCreateRaid() {
    const name = newRaidName.trim();
    addRaid(name || undefined);
    setNewRaidName("");
  }

  return (
    <div className="campo-assignment">
      <h2 className="campo-label">Raids</h2>
      <p className="campo-hint">
        Creá un raid, definí qué tipo de parties necesita y armalas ahí directo, o arrastrá (o tocá) una
        party desde &quot;Sin asignar&quot; para moverla a un raid — máximo 8 parties por raid.
      </p>

      <div className="raid-create-form">
        <input
          className="core-input raid-create-input"
          placeholder="Nombre del raid (opcional)"
          value={newRaidName}
          onChange={(e) => setNewRaidName(e.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={handleCreateRaid}>
          <Plus size={14} />
          Crear raid
        </button>
      </div>

      {raids.length > 0 && (
        <div className="campo-assignment-columns raid-columns">
          {raids.map((raid) => (
            <RaidColumn key={raid.id} raidId={raid.id} campo={campo} />
          ))}
        </div>
      )}
    </div>
  );
}
