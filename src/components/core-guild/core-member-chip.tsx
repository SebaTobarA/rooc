"use client";

import type { KeyboardEvent } from "react";
import { X } from "lucide-react";
import type { Player } from "@/types/party";
import { setDragPayload } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";
import type { CoreMember } from "@/lib/core-guild/types";

const ROLE_CLASS: Record<Player["rol"], string> = {
  Tank: "chip-tank",
  Support: "chip-support",
  DPS: "chip-dps",
  Flexible: "chip-flex",
};

const WALLET_LABEL: Record<CoreMember["walletType"], string> = {
  F2P: "F2P",
  MS: "MS",
  BALLENA: "Ballena",
};

interface CoreMemberChipProps {
  player: Player;
  member: CoreMember;
  draggable?: boolean;
  onRemove?: (id: string) => void;
}

/** Como PlayerChip (drag & drop + selección táctil), más un badge de etiqueta de grupo y el tipo de wallet. */
export function CoreMemberChip({ player, member, draggable = true, onRemove }: CoreMemberChipProps) {
  const { selected, selectPlayer } = usePlayerSelection();
  const isSelected = selected?.kind === "player" && selected.id === player.id;

  function handleSelect() {
    if (!draggable) return;
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
      className={`player-chip core-member-chip ${ROLE_CLASS[player.rol]} ${isSelected ? "player-chip--selected" : ""}`}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        // Sin esto, el dragstart burbujea hasta el <PartyCard> contenedor
        // (también arrastrable, para llevarlo entero a una guild) y su
        // propio onDragStart pisa este payload de "jugador" con uno de
        // "party" antes de soltar — el drop entre parties quedaba
        // rechazado en silencio.
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
      aria-label={`${player.nickname}, ${player.clase}${isSelected ? " (seleccionado)" : ""}`}
    >
      <span className="chip-nick">{player.nickname}</span>
      <span className="chip-class">{player.clase}</span>
      {member.groupMode === "GROUP" && member.groupTag && (
        <span className="chip-tag" title={`Grupo: ${member.groupTag}`}>
          {member.groupTag}
        </span>
      )}
      <span className={`chip-wallet chip-wallet-${member.walletType.toLowerCase()}`}>
        {WALLET_LABEL[member.walletType]}
      </span>
      {onRemove && (
        <button
          className="chip-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(player.id);
          }}
          aria-label={`Quitar a ${player.nickname} de la party`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
