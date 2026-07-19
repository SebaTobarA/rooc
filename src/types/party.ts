export type Role = "Tank" | "DPS" | "Support" | "Flexible";

export type SlotLabel = "Tanque" | "Daño" | "Soporte" | "Flexible";

export type EventType = "guild" | "emperium" | null;

export interface Player {
  id: string;
  nickname: string;
  clase: string;
  rol: Role;
  partyId: string | null;
}

export type CampoSide = "principal" | "secundario";

export interface Party {
  id: string;
  name: string;
  capacity: number;
  // A qué campo está asignada esta party en Guild League (null = todavía en
  // el grid "sin asignar a campo"). Emperium Overrun no usa campos, así que
  // sus parties quedan siempre en null.
  campo: CampoSide | null;
}

export interface ImportResult {
  added: number;
  skipped: string[];
  limitError?: string;
}
