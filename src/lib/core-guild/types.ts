import type { SlotLabel } from "@/types/party";

export type WalletType = "F2P" | "MS" | "BALLENA";
export type GroupMode = "SOLO" | "GROUP";

// Un miembro del rol [SD] Core dentro del board — datos de Discord
// denormalizados (igual que LeadershipMember/GuildApplication) más los
// campos editables desde /admin/core-guild.
export interface CoreMember {
  discordId: string;
  username: string;
  globalName: string | null;
  nick: string | null;
  avatarHash: string | null;
  // Clase de RO (ej. "Paladín", "Stalker") — sugerida desde el rol de
  // Discord al aparecer por primera vez, editable a mano después.
  jobRole: string;
  groupMode: GroupMode;
  // Solo relevante si groupMode = "GROUP". Varios miembros con el mismo
  // texto quedan marcados como el mismo grupo interno.
  groupTag: string;
  walletType: WalletType;
  // true si el miembro todavía tiene el rol Core en Discord al último
  // sync. Si es false, se conserva la fila (no se borra sola) para que el
  // admin decida a mano si la saca.
  inCore: boolean;
  partyId: string | null;
}

export interface CorePartySlot {
  id: string;
  name: string;
  capacity: number;
  // Party "lista" — el admin la marcó como terminada. "Organizar parties"
  // no toca a sus miembros, y no se pueden arrastrar jugadores hacia
  // adentro/afuera (sí se la puede seguir arrastrando entera a una guild).
  locked: boolean;
}

export interface CoreGuild {
  id: string;
  name: string;
  // Nivel de guild en el juego (1-5), informativo.
  level: number;
  // Cupo real cargado a mano por el admin — no se infiere del nivel.
  cap: number;
  // Orden de las parties asignadas a esta guild.
  partyIds: string[];
}

export interface CoreGuildBoardData {
  members: CoreMember[];
  parties: CorePartySlot[];
  compositions: SlotLabel[][];
  guilds: CoreGuild[];
}
