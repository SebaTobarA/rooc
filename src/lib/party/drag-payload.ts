import type { DragEvent } from "react";

/**
 * Payload que viaja en el dataTransfer nativo de HTML5 DnD al arrastrar un
 * jugador — reemplaza el viejo mecanismo de ref local por instancia de
 * Campo, que no permitía arrastrar de un campo a otro. `origin` dice de
 * dónde viene el jugador ("source" = pool de inscriptos del evento, todavía
 * sin asignar a ningún campo), así el que recibe el drop sabe de dónde
 * sacarlo antes de agregarlo en el destino.
 */
export type DragOrigin = "source" | "campo1" | "campo2";

export interface DragPayload {
  id: string;
  origin: DragOrigin;
}

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
