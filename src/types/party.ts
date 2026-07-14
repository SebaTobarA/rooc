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

export interface Party {
  id: string;
  name: string;
  capacity: number;
}

export interface ImportResult {
  added: number;
  skipped: string[];
  limitError?: string;
}
