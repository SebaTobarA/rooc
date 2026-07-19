"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DragPayload, PartyDragPayload, PlayerDragPayload } from "@/lib/party/drag-payload";

/**
 * Alternativa al drag & drop nativo (HTML5 DnD no dispara en pantallas
 * táctiles). Tocar un jugador o una party completa la selecciona; tocar una
 * zona destino (pool de inscritos, "Sin asignar" de un campo, una party, o
 * una columna de Campo Principal/Secundario) la mueve ahí — mismo resultado
 * que soltarla con el mouse.
 */
interface PlayerSelectionValue {
  selected: DragPayload | null;
  selectPlayer: (payload: PlayerDragPayload) => void;
  selectParty: (payload: PartyDragPayload) => void;
  clearSelection: () => void;
}

const PlayerSelectionContext = createContext<PlayerSelectionValue | null>(null);

export function PlayerSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<DragPayload | null>(null);

  const selectPlayer = useCallback((payload: PlayerDragPayload) => {
    setSelected((prev) => (prev?.kind === "player" && prev.id === payload.id ? null : payload));
  }, []);

  const selectParty = useCallback((payload: PartyDragPayload) => {
    setSelected((prev) => (prev?.kind === "party" && prev.partyId === payload.partyId ? null : payload));
  }, []);

  const clearSelection = useCallback(() => setSelected(null), []);

  const value = useMemo(
    () => ({ selected, selectPlayer, selectParty, clearSelection }),
    [selected, selectPlayer, selectParty, clearSelection]
  );

  return <PlayerSelectionContext.Provider value={value}>{children}</PlayerSelectionContext.Provider>;
}

export function usePlayerSelection(): PlayerSelectionValue {
  const ctx = useContext(PlayerSelectionContext);
  if (!ctx) {
    throw new Error("usePlayerSelection debe usarse dentro de un PlayerSelectionProvider");
  }
  return ctx;
}
