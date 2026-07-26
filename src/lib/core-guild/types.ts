export type WalletType = "F2P" | "MS" | "BALLENA";
export type GroupMode = "SOLO" | "GROUP";
// Guild in-game elegida por el miembro en la encuesta de Discord (ver
// src/lib/core-guild/guild-choice.ts) — independiente de las CoreGuild de
// más abajo, que son los contenedores de parties del organizador.
export type GuildChoice = "SD1" | "SD2" | "SD3" | "SD4";

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
  // Respondida desde la encuesta de Discord (o cargada a mano por el
  // admin) — en qué SpecialDelivery 1-4 dice estar el miembro. null si
  // todavía no respondió.
  guildChoice: GuildChoice | null;
}

export interface CorePartySlot {
  id: string;
  name: string;
  // Ya no representa un cupo real (no hay composición por rol en Core
  // Guild) — se recalcula en el render como members.length, solo queda
  // acá para no tener que tocar PartyCard (compartido con Overrun/
  // Emperium, que sí usa un cupo real).
  capacity: number;
  // Party "lista" — el admin la marcó como terminada. "Agrupar por
  // etiqueta" no toca a sus miembros, y no se pueden arrastrar jugadores
  // hacia adentro/afuera (sí se la puede seguir arrastrando entera a una
  // guild). También habilita "Crear rol" en Discord para el grupo.
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
  // ID de un rol ya existente en Discord (ej. el rol "SD2") que identifica a
  // los miembros de esta guild — lo tipea el admin a mano, no lo crea Boo
  // (a diferencia de teamRoles, que sí crea roles nuevos por equipo).
  discordRoleId?: string;
}

export interface CoreGuildBoardData {
  members: CoreMember[];
  parties: CorePartySlot[];
  guilds: CoreGuild[];
  // ID de party (grupo) -> ID del rol ya creado en Discord para ese grupo.
  // Ausente/vacío en boards guardados antes de esta funcionalidad.
  teamRoles: Record<string, string>;
  // Mensaje público de la encuesta de organización (ver survey-roster.ts)
  // — se edita in-place cada vez que alguien responde, en vez de publicar
  // uno nuevo. null hasta la primera publicación.
  surveyMessage: { channelId: string; messageId: string } | null;
}

/** Board vacío — misma forma que usan use-core-guild-board.ts (cliente) y survey-response.ts/survey-roster.ts (servidor) cuando todavía no existe una fila en la base. */
export function emptyCoreGuildBoardData(): CoreGuildBoardData {
  return {
    members: [],
    parties: [],
    guilds: [],
    teamRoles: {},
    surveyMessage: null,
  };
}
