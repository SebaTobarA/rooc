"use client";

import { X } from "lucide-react";
import type { Player } from "@/types/party";
import { setDragPayload, type DragOrigin } from "@/lib/party/drag-payload";

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
  return (
    <div
      className={`player-chip ${ROLE_CLASS[player.rol]}`}
      draggable
      onDragStart={(e) => setDragPayload(e, { id: player.id, origin })}
      role="listitem"
    >
      <span className="chip-nick">{player.nickname}</span>
      <span className="chip-class">{player.clase}</span>
      {onRemove && (
        <button
          className="chip-remove"
          onClick={() => onRemove(player.id)}
          aria-label={`Eliminar a ${player.nickname}`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
