"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DragPayload } from "@/lib/party/drag-payload";

/**
 * Alternativa al drag & drop nativo (HTML5 DnD no dispara en pantallas
 * táctiles). Tocar un jugador lo selecciona; tocar una zona destino
 * (pool de inscriptos, "Sin asignar" de un campo, o una party) lo mueve
 * ahí — mismo resultado que soltarlo con el mouse.
 */
interface PlayerSelectionValue {
  selected: DragPayload | null;
  selectPlayer: (payload: DragPayload) => void;
  clearSelection: () => void;
}

const PlayerSelectionContext = createContext<PlayerSelectionValue | null>(null);

export function PlayerSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<DragPayload | null>(null);

  const selectPlayer = useCallback((payload: DragPayload) => {
    setSelected((prev) => (prev && prev.id === payload.id ? null : payload));
  }, []);

  const clearSelection = useCallback(() => setSelected(null), []);

  const value = useMemo(
    () => ({ selected, selectPlayer, clearSelection }),
    [selected, selectPlayer, clearSelection]
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
