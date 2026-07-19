import type { DragEvent } from "react";

/**
 * Payload que viaja en el dataTransfer nativo de HTML5 DnD — reemplaza el
 * viejo mecanismo de ref local por instancia de Campo, que no permitía
 * arrastrar de un campo a otro. Dos formas, discriminadas por `kind`:
 * mover un jugador suelto (dentro del pool "sin asignar" o entre parties),
 * o mover una party completa (para asignarla a Campo Principal/Secundario
 * en Guild League — ver campo-assignment.tsx).
 */
export interface PlayerDragPayload {
  kind: "player";
  id: string;
}

export interface PartyDragPayload {
  kind: "party";
  partyId: string;
}

export type DragPayload = PlayerDragPayload | PartyDragPayload;

const MIME_TYPE = "application/json";

export function setDragPayload(e: DragEvent, payload: DragPayload): void {
  e.dataTransfer.setData(MIME_TYPE, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

export function readDragPayload(e: DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(MIME_TYPE);
    if (!raw) return null;
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}
