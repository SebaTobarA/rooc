"use client";

import type { DragEvent } from "react";
import type { Player } from "@/types/party";
import { PlayerChip } from "@/components/party/player-chip";
import { readDragPayload, type DragPayload } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";

/**
 * Pool de inscriptos a un evento de Discord, todavía sin arrastrar a
 * Campo Principal ni Campo Secundario. Vive arriba de los dos <Campo> en
 * GuildLeague. Soporta tanto arrastrar con mouse como tocar un jugador
 * seleccionado y luego tocar acá (las pantallas táctiles no disparan
 * eventos de drag & drop nativos).
 */
export function EventSignupPool({
  players,
  onDropPayload,
}: {
  players: Player[];
  onDropPayload: (payload: DragPayload) => void;
}) {
  const { selected, clearSelection } = usePlayerSelection();

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (payload) onDropPayload(payload);
  }

  function handleClick() {
    if (!selected) return;
    onDropPayload(selected);
    clearSelection();
  }

  return (
    <div className="pool-section">
      <div className="pool-header">
        <span className="pool-title">Inscriptos del evento ({players.length})</span>
      </div>
      <div
        className={`player-pool ${selected && selected.origin !== "source" ? "player-pool--armed" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={handleClick}
        role="list"
        aria-label="Inscriptos del evento, sin asignar a un campo. Toca un jugador seleccionado para devolverlo acá."
      >
        {players.map((p) => (
          <PlayerChip key={p.id} player={p} origin="source" />
        ))}
        {players.length === 0 && <p className="pool-empty">Sin inscriptos cargados todavía</p>}
      </div>
    </div>
  );
}
