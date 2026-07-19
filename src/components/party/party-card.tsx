"use client";

import { useState, type DragEvent } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type { Player, Party } from "@/types/party";
import { PlayerChip } from "@/components/party/player-chip";
import type { DragOrigin } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";

interface PartyCardProps {
  party: Party;
  members: Player[];
  origin: DragOrigin;
  onDrop: (e: DragEvent, partyId: string) => void;
  onClickAssign: () => void;
  onRemovePlayer: (id: string) => void;
}

export function PartyCard({ party, members, origin, onDrop, onClickAssign, onRemovePlayer }: PartyCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { selected } = usePlayerSelection();

  const hasNoTank = !members.some((m) => m.rol === "Tank");
  const hasNoSupport = !members.some((m) => m.rol === "Support");
  const missingRoles = [
    ...(hasNoTank ? ["Tanque"] : []),
    ...(hasNoSupport ? ["Curación"] : []),
  ];
  const isIncomplete = members.length > 0 && members.length < party.capacity;

  return (
    <div className={`party-card ${isDragOver ? "party-card--dragover" : ""}`}>
      <div className="party-card-header">
        <span className="party-card-name">{party.name}</span>
        <span className="party-card-count">
          {members.length}/{party.capacity}
        </span>
      </div>

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
        className={`party-dropzone ${selected ? "party-dropzone--armed" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          onDrop(e, party.id);
        }}
        onClick={onClickAssign}
        role="list"
        aria-label={`Party ${party.name}. Toca un jugador seleccionado para agregarlo acá.`}
      >
        {members.map((p) => (
          <PlayerChip key={p.id} player={p} origin={origin} onRemove={onRemovePlayer} />
        ))}
        {members.length === 0 && <p className="party-empty">Arrastra jugadores aquí</p>}
      </div>
    </div>
  );
}
