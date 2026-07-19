"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, GripVertical, Info } from "lucide-react";
import type { Player, Party } from "@/types/party";
import { PlayerChip } from "@/components/party/player-chip";
import { setDragPayload } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";

interface PartyCardProps {
  party: Party;
  members: Player[];
  onDrop: (e: DragEvent, partyId: string) => void;
  onClickAssign: () => void;
  onRemovePlayer: (id: string) => void;
  /** Fila colapsada por defecto (nombre + contador + estado), pensada para
   * las columnas de Campo Principal/Secundario: ahí la composición ya se
   * armó antes, así que ver de un vistazo si cada party está completa
   * importa más que tener los chips siempre visibles. Se expande al tocar
   * la flecha. */
  compact?: boolean;
}

export function PartyCard({
  party,
  members,
  onDrop,
  onClickAssign,
  onRemovePlayer,
  compact = false,
}: PartyCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const { selected, selectParty } = usePlayerSelection();

  const isPartySelected = selected?.kind === "party" && selected.partyId === party.id;
  const isPlayerArmed = selected?.kind === "player";

  const hasNoTank = !members.some((m) => m.rol === "Tank");
  const hasNoSupport = !members.some((m) => m.rol === "Support");
  const missingRoles = [
    ...(hasNoTank ? ["Tanque"] : []),
    ...(hasNoSupport ? ["Curación"] : []),
  ];
  const isIncomplete = members.length > 0 && members.length < party.capacity;
  const isComplete = members.length > 0 && members.length >= party.capacity;

  function handleSelectParty() {
    selectParty({ kind: "party", partyId: party.id });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectParty();
    }
  }

  return (
    <div
      className={`party-card ${compact ? "party-card--compact" : ""} ${isDragOver ? "party-card--dragover" : ""} ${isPartySelected ? "party-card--selected" : ""}`}
      draggable
      onDragStart={(e) => setDragPayload(e, { kind: "party", partyId: party.id })}
      onClick={handleSelectParty}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
      aria-label={`Party ${party.name}, completa${isPartySelected ? " (seleccionada)" : ""}. Toca para seleccionarla y luego toca Campo Principal o Secundario.`}
    >
      <div className="party-card-header">
        <GripVertical size={13} className="party-card-grip" aria-hidden="true" />
        <span className="party-card-name">{party.name}</span>
        {compact && (
          <span
            className={`party-card-status ${isComplete ? "party-card-status--ok" : "party-card-status--warn"}`}
            aria-hidden="true"
          >
            {isComplete ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          </span>
        )}
        <span className="party-card-count">
          {members.length}/{party.capacity}
        </span>
        {compact && (
          <button
            type="button"
            className="party-card-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-label={expanded ? `Contraer ${party.name}` : `Expandir ${party.name}`}
            aria-expanded={expanded}
          >
            <ChevronDown size={14} className={expanded ? "party-card-toggle-icon--open" : ""} />
          </button>
        )}
      </div>

      {expanded && (
        <>
          {isIncomplete && missingRoles.length === 0 && (
            <div className="party-notice party-notice--info">
              <Info size={12} />
              <span>Party incompleta</span>
            </div>
          )}

          {missingRoles.length > 0 && (
            <div className="party-notice party-notice--warn">
              <AlertTriangle size={12} />
              <span>Falta: {missingRoles.join(", ")}</span>
            </div>
          )}

          <div
            className={`party-dropzone ${isPlayerArmed ? "party-dropzone--armed" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              onDrop(e, party.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClickAssign();
            }}
            role="list"
            aria-label={`Miembros de ${party.name}. Toca un jugador seleccionado para agregarlo acá.`}
          >
            {members.map((p) => (
              <PlayerChip key={p.id} player={p} onRemove={onRemovePlayer} />
            ))}
            {members.length === 0 && <p className="party-empty">Arrastra jugadores aquí</p>}
          </div>
        </>
      )}
    </div>
  );
}
