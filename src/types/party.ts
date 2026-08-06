export type Role = "Tank" | "DPS" | "Support" | "Flexible";

export type SlotLabel = "Tanque" | "Daño" | "Soporte" | "Flexible";

export type EventType = "guild" | "emperium" | null;

export type CampoSide = "principal" | "secundario";

export interface Player {
  id: string;
  nickname: string;
  clase: string;
  rol: Role;
  partyId: string | null;
  // Si viene de un evento en modo DECLINE y avisó que llega tarde, solo
  // puede arrastrarse a parties de ese campo (ver use-campo.ts
  // assignPlayer/assignPartyCampo). null/undefined = sin restricción.
  campoRestriction?: CampoSide | null;
}

export interface Party {
  id: string;
  name: string;
  capacity: number;
  // A qué campo está asignada esta party en Guild League (null = todavía en
  // el grid "sin asignar a campo"). Emperium Overrun no usa campos, así que
  // sus parties quedan siempre en null.
  campo: CampoSide | null;
  // A qué raid está asignada esta party en Emperium Overrun (null = todavía
  // sin asignar a un raid) — ver Raid más abajo. Guild League no usa raids,
  // así que sus parties quedan siempre en null acá.
  raidId: string | null;
}

// Un raid de Emperium Overrun: entre 1 y 8 parties (reforzado en
// use-campo.ts, no acá), con su propia composición — cada raid puede
// pedir un tipo de party distinto del resto.
export interface Raid {
  id: string;
  name: string;
  compositions: SlotLabel[][];
}

export interface ImportResult {
  added: number;
  skipped: string[];
  limitError?: string;
}
