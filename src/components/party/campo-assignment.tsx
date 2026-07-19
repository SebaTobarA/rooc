"use client";

import { useState, type DragEvent } from "react";
import type { UseCampoReturn } from "@/lib/party/use-campo";
import type { CampoSide } from "@/types/party";
import { PartyCard } from "@/components/party/party-card";
import { readDragPayload } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";

const CAMPO_LABEL: Record<CampoSide, string> = {
  principal: "Campo Principal",
  secundario: "Campo Secundario",
};

function CampoColumn({ side, campo }: { side: CampoSide; campo: UseCampoReturn }) {
  const { players, parties, assignPlayer, assignPartyCampo, removePlayer } = campo;
  const { selected, clearSelection } = usePlayerSelection();
  const [error, setError] = useState("");

  const partiesInSide = parties.filter((p) => p.campo === side);
  const isPartyArmed = selected?.kind === "party";

  function handleColumnDrop(e: DragEvent) {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (!payload || payload.kind !== "party") return;
    const err = assignPartyCampo(payload.partyId, side);
    setError(err ?? "");
    if (!err) clearSelection();
    if (err) setTimeout(() => setError(""), 4000);
  }

  function handleColumnClick() {
    if (!selected || selected.kind !== "party") return;
    const err = assignPartyCampo(selected.partyId, side);
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

  return (
    <div className="campo-column">
      <div className="campo-column-header">
        <span className="campo-column-title">{CAMPO_LABEL[side]}</span>
        <span className="campo-column-count">{partiesInSide.length}/8 parties</span>
      </div>
      {error && <p className="campo-error">{error}</p>}
      <div
        className={`campo-column-drop ${isPartyArmed ? "campo-column-drop--armed" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleColumnDrop}
        onClick={handleColumnClick}
        role="list"
        aria-label={`${CAMPO_LABEL[side]}. Toca una party seleccionada para asignarla acá.`}
      >
        {partiesInSide.map((party) => (
          <PartyCard
            key={party.id}
            party={party}
            members={players.filter((p) => p.partyId === party.id)}
            onDrop={handlePlayerDrop}
            onClickAssign={() => handlePlayerClickAssign(party.id)}
            onRemovePlayer={removePlayer}
          />
        ))}
        {partiesInSide.length === 0 && (
          <p className="pool-empty">Arrastra o toca una party para asignarla acá</p>
        )}
      </div>
    </div>
  );
}

/**
 * Las 16 parties de Guild League empiezan sin campo asignado, en el grid
 * "sin asignar" de <Campo>. Acá se arrastra (o toca, en celular) la party
 * completa para mandarla a uno de los dos campos — máximo 8 cada uno,
 * reforzado por useCampo.assignPartyCampo.
 */
export function CampoAssignment({ campo }: { campo: UseCampoReturn }) {
  if (campo.parties.length === 0) return null;

  return (
    <div className="campo-assignment">
      <h2 className="campo-label">Asignación a campo</h2>
      <p className="campo-hint">
        Arrastra una party completa (o tócala y luego toca la columna destino) para asignarla a Campo
        Principal o Campo Secundario. Máximo 8 parties por campo.
      </p>
      <div className="campo-assignment-columns">
        <CampoColumn side="principal" campo={campo} />
        <CampoColumn side="secundario" campo={campo} />
      </div>
    </div>
  );
}
