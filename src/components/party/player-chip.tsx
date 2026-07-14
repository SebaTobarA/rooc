"use client";

import { X } from "lucide-react";
import type { Player } from "@/types/party";

const ROLE_CLASS: Record<Player["rol"], string> = {
  Tank: "chip-tank",
  Support: "chip-support",
  DPS: "chip-dps",
  Flexible: "chip-flex",
};

interface PlayerChipProps {
  player: Player;
  onRemove: (id: string) => void;
  onDragStart: (id: string) => void;
}

export function PlayerChip({ player, onRemove, onDragStart }: PlayerChipProps) {
  return (
    <div
      className={`player-chip ${ROLE_CLASS[player.rol]}`}
      draggable
      onDragStart={() => onDragStart(player.id)}
      role="listitem"
    >
      <span className="chip-nick">{player.nickname}</span>
      <span className="chip-class">{player.clase}</span>
      <button
        className="chip-remove"
        onClick={() => onRemove(player.id)}
        aria-label={`Eliminar a ${player.nickname}`}
      >
        <X size={12} />
      </button>
    </div>
  );
}
