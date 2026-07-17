"use client";

import type { DragEvent } from "react";
import type { Player } from "@/types/party";
import { PlayerChip } from "@/components/party/player-chip";

/**
 * Pool de inscriptos a un evento de Discord, todavía sin arrastrar a
 * Campo Principal ni Campo Secundario. Vive arriba de los dos <Campo> en
 * GuildLeague — arrastrar un chip de acá adentro de un campo lo asigna;
 * arrastrar un chip de un campo hasta acá lo devuelve al pool.
 */
export function EventSignupPool({
  players,
  onDrop,
}: {
  players: Player[];
  onDrop: (e: DragEvent) => void;
}) {
  return (
    <div className="pool-section">
      <div className="pool-header">
        <span className="pool-title">Inscriptos del evento ({players.length})</span>
      </div>
      <div
        className="player-pool"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        role="list"
        aria-label="Inscriptos del evento, sin asignar a un campo"
      >
        {players.map((p) => (
          <PlayerChip key={p.id} player={p} origin="source" />
        ))}
        {players.length === 0 && <p className="pool-empty">Sin inscriptos cargados todavía</p>}
      </div>
    </div>
  );
}
