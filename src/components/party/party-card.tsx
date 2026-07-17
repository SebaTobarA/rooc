"use client";

import { useState, type DragEvent } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type { Player, Party } from "@/types/party";
import { PlayerChip } from "@/components/party/player-chip";
import type { DragOrigin } from "@/lib/party/drag-payload";

interface PartyCardProps {
  party: Party;
  members: Player[];
  origin: DragOrigin;
  onDrop: (e: DragEvent, partyId: string) => void;
  onRemovePlayer: (id: string) => void;
}

export function PartyCard({ party, members, origin, onDrop, onRemovePlayer }: PartyCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

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
        className="party-dropzone"
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
        role="list"
        aria-label={`Party ${party.name}`}
      >
        {members.map((p) => (
          <PlayerChip key={p.id} player={p} origin={origin} onRemove={onRemovePlayer} />
        ))}
        {members.length === 0 && <p className="party-empty">Arrastra jugadores aquí</p>}
      </div>
    </div>
  );
}
