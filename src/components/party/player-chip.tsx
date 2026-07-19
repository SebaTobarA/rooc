"use client";

import { X } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { Player } from "@/types/party";
import { setDragPayload, type DragOrigin } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";

const ROLE_CLASS: Record<Player["rol"], string> = {
  Tank: "chip-tank",
  Support: "chip-support",
  DPS: "chip-dps",
  Flexible: "chip-flex",
};

interface PlayerChipProps {
  player: Player;
  origin: DragOrigin;
  onRemove?: (id: string) => void;
}

export function PlayerChip({ player, origin, onRemove }: PlayerChipProps) {
  const { selected, selectPlayer } = usePlayerSelection();
  const isSelected = selected?.id === player.id;

  function handleSelect() {
    selectPlayer({ id: player.id, origin });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect();
    }
  }

  return (
    <div
      className={`player-chip ${ROLE_CLASS[player.rol]} ${isSelected ? "player-chip--selected" : ""}`}
      draggable
      onDragStart={(e) => setDragPayload(e, { id: player.id, origin })}
      onClick={(e) => {
        e.stopPropagation();
        handleSelect();
      }}
      onKeyDown={handleKeyDown}
      role="listitem"
      tabIndex={0}
      aria-label={`${player.nickname}, ${player.clase}${isSelected ? " (seleccionado)" : ""}`}
    >
      <span className="chip-nick">{player.nickname}</span>
      <span className="chip-class">{player.clase}</span>
      {onRemove && (
        <button
          className="chip-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(player.id);
          }}
          aria-label={`Eliminar a ${player.nickname}`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
