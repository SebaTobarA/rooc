"use client";

import { X } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { Player } from "@/types/party";
import { setDragPayload } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";

const ROLE_CLASS: Record<Player["rol"], string> = {
  Tank: "chip-tank",
  Support: "chip-support",
  DPS: "chip-dps",
  Flexible: "chip-flex",
};

interface PlayerChipProps {
  player: Player;
  onRemove?: (id: string) => void;
  /** Si se pasa, un jugador sin clase (ej. importado por rol de Discord sin
   * clase asignada ahí) muestra un input inline para completarla en vez de
   * un chip vacío — ver discord-role-import.tsx. */
  onUpdateClass?: (id: string, clase: string) => void;
}

export function PlayerChip({ player, onRemove, onUpdateClass }: PlayerChipProps) {
  const { selected, selectPlayer } = usePlayerSelection();
  const isSelected = selected?.kind === "player" && selected.id === player.id;

  function handleSelect() {
    selectPlayer({ kind: "player", id: player.id });
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
      onDragStart={(e) => {
        // Sin esto, el dragstart burbujea hasta el <PartyCard> contenedor
        // (también arrastrable, para llevarlo entero a Campo Principal/
        // Secundario) y su propio onDragStart pisa este payload de
        // "jugador" con uno de "party" antes de soltar — el drop entre
        // parties quedaba rechazado en silencio.
        e.stopPropagation();
        setDragPayload(e, { kind: "player", id: player.id });
      }}
      onClick={(e) => {
        e.stopPropagation();
        handleSelect();
      }}
      onKeyDown={handleKeyDown}
      role="listitem"
      tabIndex={0}
      aria-label={`${player.nickname}, ${player.clase || "sin clase"}${player.campoRestriction ? ", llega tarde" : ""}${isSelected ? " (seleccionado)" : ""}`}
    >
      <span className="chip-nick">
        {player.campoRestriction && <span title="Llega tarde — solo Campo Secundario">⏰ </span>}
        {player.nickname}
      </span>
      {!player.clase && onUpdateClass ? (
        <input
          key={player.id}
          type="text"
          defaultValue=""
          placeholder="Sin clase ⚠"
          className="chip-class-input"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          onBlur={(e) => {
            const value = e.currentTarget.value.trim();
            if (value) onUpdateClass(player.id, value);
          }}
        />
      ) : (
        <span className="chip-class">{player.clase || "Sin clase ⚠"}</span>
      )}
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
