/**
 * Tablero del Party Builder y las operaciones con que se edita el borrador
 * compartido (PartyDraft). Este archivo es puro y lo usan los dos lados: el
 * servidor aplica cada operación sobre el tablero vigente (así dos oficiales
 * trabajando en partes distintas no se pisan) y el cliente aplica las suyas
 * todavía sin confirmar encima del último tablero recibido, para ver el
 * cambio al instante.
 *
 * Las operaciones son idempotentes (crear una party con un id que ya existe
 * no hace nada, mover a alguien adonde ya está tampoco): el cliente puede
 * reintentar un envío o reaplicar una operación que el servidor ya incluyó
 * sin que se duplique nada. Si dos personas mueven al mismo jugador, gana la
 * última operación que llega, sin tocar el resto del tablero.
 */

import type { CampoSide, Party, Raid, SlotLabel } from "@/types/party";
import type { PartyTemplateSnapshot } from "@/lib/party/template-snapshot";

export type DraftEventType = "GUILD_LEAGUE" | "EMPERIUM_OVERRUN";
export const DRAFT_EVENT_TYPES: readonly DraftEventType[] = ["GUILD_LEAGUE", "EMPERIUM_OVERRUN"];

/** Nombre y job de un jugador que ya no está en el core pero sigue en una party. */
export interface DraftPerson {
  nickname: string;
  clase: string;
}

export interface DraftBoard {
  parties: Party[];
  raids: Raid[];
  /** id de party -> discordIds de sus jugadores, en el orden en que se ven. */
  members: Record<string, string[]>;
  /**
   * Datos de jugadores asignados que no figuran en el core ni en la
   * composición publicada (por ejemplo, al cargar una plantilla vieja del
   * historial), para que todos los vean con nombre.
   */
  extras?: Record<string, DraftPerson>;
}

/** Lo que recibe el cliente del borrador de un tipo de evento. */
export interface DraftPayload {
  version: number;
  publishedVersion: number;
  board: DraftBoard;
  updatedByName: string | null;
  updatedAt: string;
  publishedAt: string | null;
  publishedByName: string | null;
}

export interface DraftEditor {
  name: string;
  event: DraftEventType;
}

export type DraftOp =
  /** A una party (al final, o antes de `beforeId`) o, con partyId null, al pool. */
  | { kind: "move"; playerId: string; partyId: string | null; beforeId?: string | null }
  /** Party nueva; con `playerId`, además mete ahí a ese jugador. */
  | { kind: "addParty"; id: string; campo: CampoSide | null; raidId: string | null; playerId?: string | null }
  | { kind: "removeParty"; id: string }
  | { kind: "renameParty"; id: string; name: string }
  /**
   * Mueve la party completa (con sus jugadores) a un raid o a "sin raid",
   * antes de `beforeId` o al final: así se cambia de raid y se ordena.
   */
  | { kind: "moveParty"; id: string; campo: CampoSide | null; raidId: string | null; beforeId?: string | null }
  /** Pone o saca el candado; con `savedPartyId` la enlaza a su party guardada. */
  | { kind: "lockParty"; id: string; locked: boolean; savedPartyId?: string | null }
  /**
   * Agrega una party guardada (SavedParty) con sus jugadores y con candado.
   * Quien ya esté en otra party con candado se queda donde está.
   */
  | {
      kind: "addSavedParty";
      id: string;
      savedPartyId: string;
      name: string;
      campo: CampoSide | null;
      raidId: string | null;
      playerIds: string[];
      /** Nombre y job de quien no esté en el core, para que todos lo vean. */
      people?: Record<string, DraftPerson>;
    }
  | { kind: "addRaid"; id: string; campo: CampoSide | null }
  | { kind: "removeRaid"; id: string }
  | { kind: "renameRaid"; id: string; name: string }
  /** Parties sugeridas por composición; solo se ubica a quien siga sin party. */
  | {
      kind: "suggest";
      campo: CampoSide | null;
      raidId: string | null;
      parties: { id: string; playerIds: string[] }[];
    }
  /** Reemplaza el tablero entero: solo para cargar una plantilla del historial. */
  | { kind: "replace"; board: DraftBoard };

// Igual que en el juego: una party son 5 jugadores y un raid, hasta 8 parties.
export const PARTY_SIZE = 5;
export const MAX_PARTIES_PER_RAID = 8;
const MAX_NAME = 40;
const MAX_ID = 64;
const MAX_PARTIES = 200;
const MAX_RAIDS = 50;
export const MAX_OPS_PER_BATCH = 200;

export function emptyBoard(): DraftBoard {
  return { parties: [], raids: [], members: {} };
}

export function boardFromSnapshot(snapshot: PartyTemplateSnapshot): DraftBoard {
  // El orden dentro de cada party es el de la lista de jugadores guardada.
  const members: Record<string, string[]> = {};
  for (const player of snapshot.players) {
    if (player.partyId) (members[player.partyId] ??= []).push(player.id);
  }
  return { parties: snapshot.parties, raids: snapshot.raids, members };
}

/** Parties del mismo grupo (campo + raid, o "sin raid"): el tope de 8 es por grupo. */
function partiesInGroup(board: DraftBoard, campo: CampoSide | null, raidId: string | null): Party[] {
  return board.parties.filter((party) => party.campo === campo && (party.raidId ?? null) === raidId);
}

function defaultPartyName(board: DraftBoard, campo: CampoSide | null, raidId: string | null): string {
  return `Party ${partiesInGroup(board, campo, raidId).length + 1}`;
}

function withoutPlayer(members: Record<string, string[]>, playerId: string): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(members).map(([partyId, ids]) => [partyId, ids.filter((id) => id !== playerId)])
  );
}

/** Quita de `extras` a quien ya no esté en ninguna party. */
function pruneExtras(board: DraftBoard): DraftBoard {
  if (!board.extras) return board;
  const assigned = new Set(Object.values(board.members).flat());
  const extras = Object.fromEntries(Object.entries(board.extras).filter(([id]) => assigned.has(id)));
  return Object.keys(extras).length > 0 ? { ...board, extras } : { ...board, extras: undefined };
}

export interface ApplyResult {
  board: DraftBoard;
  /** Motivo por el que la operación no se aplicó (el tablero queda igual). */
  error?: string;
}

/** Aplica una operación. Nunca muta `board`. */
export function applyDraftOp(board: DraftBoard, op: DraftOp): ApplyResult {
  switch (op.kind) {
    case "move": {
      // Una party con candado no suelta ni recibe jugadores.
      const fromId = Object.entries(board.members).find(([, ids]) => ids.includes(op.playerId))?.[0];
      const from = fromId ? board.parties.find((party) => party.id === fromId) : undefined;
      const lockedError = (party: Party) => `${party.name} tiene candado: desbloquéala para cambiar sus jugadores.`;
      if (from?.locked && from.id !== op.partyId) return { board, error: lockedError(from) };
      if (op.partyId) {
        const party = board.parties.find((candidate) => candidate.id === op.partyId);
        if (!party) return { board, error: "Esa party ya no existe: alguien más la eliminó." };
        if (party.locked && from?.id !== party.id) return { board, error: lockedError(party) };
        const others = (board.members[party.id] ?? []).filter((id) => id !== op.playerId).length;
        if (others >= party.capacity) {
          return { board, error: `${party.name} ya está completa (${party.capacity}/${party.capacity}).` };
        }
      }
      if (op.playerId === op.beforeId) return { board };
      const members = withoutPlayer(board.members, op.playerId);
      if (op.partyId) {
        const list = [...(members[op.partyId] ?? [])];
        const index = op.beforeId ? list.indexOf(op.beforeId) : -1;
        if (index === -1) list.push(op.playerId);
        else list.splice(index, 0, op.playerId);
        members[op.partyId] = list;
      }
      return { board: pruneExtras({ ...board, members }) };
    }

    case "addParty": {
      if (board.parties.some((party) => party.id === op.id)) return { board };
      if (op.raidId && !board.raids.some((raid) => raid.id === op.raidId)) {
        return { board, error: "Ese raid ya no existe: alguien más lo eliminó." };
      }
      if (partiesInGroup(board, op.campo, op.raidId).length >= MAX_PARTIES_PER_RAID) {
        return { board, error: `Un raid admite hasta ${MAX_PARTIES_PER_RAID} parties. Agrega otro raid.` };
      }
      if (board.parties.length >= MAX_PARTIES) return { board, error: "Hay demasiadas parties." };
      const party: Party = {
        id: op.id,
        name: defaultPartyName(board, op.campo, op.raidId),
        capacity: PARTY_SIZE,
        campo: op.campo,
        raidId: op.raidId,
      };
      const members = op.playerId
        ? { ...withoutPlayer(board.members, op.playerId), [op.id]: [op.playerId] }
        : board.members;
      return { board: pruneExtras({ ...board, parties: [...board.parties, party], members }) };
    }

    case "removeParty": {
      if (!board.parties.some((party) => party.id === op.id)) return { board };
      const members = { ...board.members };
      delete members[op.id];
      return { board: pruneExtras({ ...board, parties: board.parties.filter((party) => party.id !== op.id), members }) };
    }

    case "moveParty": {
      const party = board.parties.find((candidate) => candidate.id === op.id);
      if (!party) return { board, error: "Esa party ya no existe: alguien más la eliminó." };
      const raid = op.raidId ? board.raids.find((candidate) => candidate.id === op.raidId) : undefined;
      if (op.raidId && !raid) return { board, error: "Ese raid ya no existe: alguien más lo eliminó." };
      // En un raid, la party toma el campo del raid; en "sin raid", el pedido.
      const campo = raid ? (raid.campo ?? null) : op.campo;
      const raidId = op.raidId ?? null;
      const sameGroup = party.campo === campo && (party.raidId ?? null) === raidId;
      if (!sameGroup && partiesInGroup(board, campo, raidId).length >= MAX_PARTIES_PER_RAID) {
        return {
          board,
          error: `${raid?.name ?? "«Sin raid»"} ya tiene ${MAX_PARTIES_PER_RAID} parties: saca una antes de mover otra.`,
        };
      }
      if (op.beforeId === op.id) return { board };
      const moved: Party = { ...party, campo, raidId };
      const rest = board.parties.filter((candidate) => candidate.id !== op.id);
      const index = op.beforeId ? rest.findIndex((candidate) => candidate.id === op.beforeId) : -1;
      const parties = index === -1 ? [...rest, moved] : [...rest.slice(0, index), moved, ...rest.slice(index)];
      return { board: { ...board, parties } };
    }

    case "lockParty":
      return {
        board: {
          ...board,
          parties: board.parties.map((party) =>
            party.id === op.id
              ? {
                  ...party,
                  locked: op.locked || undefined,
                  savedPartyId: op.savedPartyId === undefined ? party.savedPartyId : op.savedPartyId,
                }
              : party
          ),
        },
      };

    case "addSavedParty": {
      if (board.parties.some((party) => party.id === op.id)) return { board };
      if (op.raidId && !board.raids.some((raid) => raid.id === op.raidId)) {
        return { board, error: "Ese raid ya no existe: alguien más lo eliminó." };
      }
      if (partiesInGroup(board, op.campo, op.raidId).length >= MAX_PARTIES_PER_RAID) {
        return { board, error: `Un raid admite hasta ${MAX_PARTIES_PER_RAID} parties. Agrega otro raid.` };
      }
      if (board.parties.length >= MAX_PARTIES) return { board, error: "Hay demasiadas parties." };
      // Quien ya va en otra party con candado se queda ahí.
      const lockedIds = new Set(
        board.parties.filter((party) => party.locked).flatMap((party) => board.members[party.id] ?? [])
      );
      const playerIds = op.playerIds.filter((id) => !lockedIds.has(id)).slice(0, PARTY_SIZE);
      let members = board.members;
      for (const id of playerIds) members = withoutPlayer(members, id);
      const party: Party = {
        id: op.id,
        name: op.name || defaultPartyName(board, op.campo, op.raidId),
        capacity: PARTY_SIZE,
        campo: op.campo,
        raidId: op.raidId,
        locked: true,
        savedPartyId: op.savedPartyId,
      };
      const people = Object.fromEntries(Object.entries(op.people ?? {}).filter(([id]) => playerIds.includes(id)));
      const extras = Object.keys(people).length > 0 ? { ...board.extras, ...people } : board.extras;
      const next = pruneExtras({
        ...board,
        parties: [...board.parties, party],
        members: { ...members, [op.id]: playerIds },
        extras,
      });
      const skipped = op.playerIds.length - playerIds.length;
      return skipped > 0
        ? {
            board: next,
            error: `${skipped} jugador(es) de «${party.name}» ya están en otra party con candado y se quedaron ahí.`,
          }
        : { board: next };
    }

    case "renameParty":
      return {
        board: {
          ...board,
          parties: board.parties.map((party) => (party.id === op.id ? { ...party, name: op.name } : party)),
        },
      };

    case "addRaid": {
      if (board.raids.some((raid) => raid.id === op.id)) return { board };
      if (board.raids.length >= MAX_RAIDS) return { board, error: "Hay demasiados raids." };
      const name = `Raid ${board.raids.filter((raid) => (raid.campo ?? null) === op.campo).length + 1}`;
      return { board: { ...board, raids: [...board.raids, { id: op.id, name, compositions: [], campo: op.campo }] } };
    }

    case "removeRaid": {
      if (!board.raids.some((raid) => raid.id === op.id)) return { board };
      const gone = new Set(board.parties.filter((party) => party.raidId === op.id).map((party) => party.id));
      return {
        board: pruneExtras({
          ...board,
          raids: board.raids.filter((raid) => raid.id !== op.id),
          parties: board.parties.filter((party) => !gone.has(party.id)),
          members: Object.fromEntries(Object.entries(board.members).filter(([partyId]) => !gone.has(partyId))),
        }),
      };
    }

    case "renameRaid":
      return {
        board: { ...board, raids: board.raids.map((raid) => (raid.id === op.id ? { ...raid, name: op.name } : raid)) },
      };

    case "suggest": {
      if (op.raidId && !board.raids.some((raid) => raid.id === op.raidId)) {
        return { board, error: "Ese raid ya no existe: alguien más lo eliminó." };
      }
      let next = board;
      const assigned = new Set(Object.values(board.members).flat());
      let added = 0;
      for (const suggested of op.parties) {
        if (next.parties.some((party) => party.id === suggested.id)) continue;
        if (partiesInGroup(next, op.campo, op.raidId).length >= MAX_PARTIES_PER_RAID) break;
        if (next.parties.length >= MAX_PARTIES) break;
        // Quien alguien más ubicó mientras tanto se queda donde está.
        const playerIds = suggested.playerIds.filter((id) => !assigned.has(id)).slice(0, PARTY_SIZE);
        if (playerIds.length === 0) continue;
        playerIds.forEach((id) => assigned.add(id));
        next = {
          ...next,
          parties: [
            ...next.parties,
            {
              id: suggested.id,
              name: defaultPartyName(next, op.campo, op.raidId),
              capacity: PARTY_SIZE,
              campo: op.campo,
              raidId: op.raidId,
            },
          ],
          members: { ...next.members, [suggested.id]: playerIds },
        };
        added++;
      }
      return added > 0 || op.parties.length === 0
        ? { board: next }
        : { board, error: "Los jugadores sugeridos ya tienen party: alguien más los ubicó." };
    }

    case "replace":
      return { board: normalizeBoard(op.board) };
  }
}

/** Aplica una lista de operaciones en orden e ignora las que no se pueden aplicar. */
export function applyDraftOps(board: DraftBoard, ops: readonly DraftOp[]): DraftBoard {
  return ops.reduce((current, op) => applyDraftOp(current, op).board, board);
}

/**
 * Deja el tablero consistente: cada jugador en una sola party, solo parties
 * existentes en `members` y sin cupos de más.
 */
function normalizeBoard(board: DraftBoard): DraftBoard {
  const raidIds = new Set(board.raids.map((raid) => raid.id));
  const parties = board.parties.map((party) =>
    party.raidId && !raidIds.has(party.raidId) ? { ...party, raidId: null } : party
  );
  const seen = new Set<string>();
  const members: Record<string, string[]> = {};
  for (const party of parties) {
    const ids = (board.members[party.id] ?? []).filter((id) => !seen.has(id)).slice(0, party.capacity);
    ids.forEach((id) => seen.add(id));
    if (ids.length > 0) members[party.id] = ids;
  }
  return pruneExtras({ parties, raids: board.raids, members, extras: board.extras });
}

// ---------------------------------------------------------------------------
// Validación de lo que llega del cliente: las server actions son endpoints
// públicos, así que no se confía en la forma de nada.
// ---------------------------------------------------------------------------

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID;
}

function readName(value: unknown): string | null {
  return typeof value === "string" ? value.slice(0, MAX_NAME) : null;
}

function readCampo(value: unknown): CampoSide | null | undefined {
  if (value === null || value === undefined) return null;
  return value === "principal" || value === "secundario" ? value : undefined;
}

function readOptionalId(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  return isId(value) ? value : undefined;
}

const SLOT_LABELS: readonly SlotLabel[] = ["Tanque", "Soporte", "Daño", "Flexible"];

function readPlayerIds(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length > max || !value.every(isId)) return null;
  return value;
}

/** Lee un tablero (de la base o de una operación "replace"); null si no tiene forma de tablero. */
export function readBoard(data: unknown): DraftBoard | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  if (!Array.isArray(raw.parties) || !Array.isArray(raw.raids) || !raw.members || typeof raw.members !== "object") {
    return null;
  }
  if (raw.parties.length > MAX_PARTIES || raw.raids.length > MAX_RAIDS) return null;

  const raids: Raid[] = [];
  for (const item of raw.raids as unknown[]) {
    const raid = item as Record<string, unknown> | null;
    const name = readName(raid?.name);
    const campo = readCampo(raid?.campo);
    if (!raid || !isId(raid.id) || name === null || campo === undefined) return null;
    const compositions = Array.isArray(raid.compositions)
      ? (raid.compositions as unknown[])
          .filter((slots): slots is SlotLabel[] =>
            Array.isArray(slots) && slots.length <= 10 && slots.every((slot) => SLOT_LABELS.includes(slot as SlotLabel))
          )
          .slice(0, 10)
      : [];
    raids.push({ id: raid.id, name, compositions, campo });
  }

  const parties: Party[] = [];
  for (const item of raw.parties as unknown[]) {
    const party = item as Record<string, unknown> | null;
    const name = readName(party?.name);
    const campo = readCampo(party?.campo);
    const raidId = readOptionalId(party?.raidId);
    if (!party || !isId(party.id) || name === null || campo === undefined || raidId === undefined) return null;
    const capacity =
      typeof party.capacity === "number" && Number.isInteger(party.capacity)
        ? Math.min(Math.max(party.capacity, 1), 10)
        : PARTY_SIZE;
    const savedPartyId = readOptionalId(party.savedPartyId);
    parties.push({
      id: party.id,
      name,
      capacity,
      campo,
      raidId,
      ...(party.locked === true ? { locked: true } : {}),
      ...(savedPartyId ? { savedPartyId } : {}),
    });
  }

  const members: Record<string, string[]> = {};
  for (const [partyId, ids] of Object.entries(raw.members as Record<string, unknown>)) {
    const list = readPlayerIds(ids, 10);
    if (!isId(partyId) || !list) return null;
    members[partyId] = list;
  }

  let extras: Record<string, DraftPerson> | undefined;
  if (raw.extras && typeof raw.extras === "object") {
    extras = {};
    for (const [id, person] of Object.entries(raw.extras as Record<string, unknown>)) {
      const data = person as Record<string, unknown> | null;
      const nickname = readName(data?.nickname);
      const clase = readName(data?.clase);
      if (isId(id) && nickname !== null && clase !== null) extras[id] = { nickname, clase };
    }
  }

  return normalizeBoard({ parties, raids, members, extras });
}

/** Valida un lote de operaciones; lanza un error si alguna no tiene la forma esperada. */
export function readDraftOps(data: unknown): DraftOp[] {
  if (!Array.isArray(data) || data.length === 0 || data.length > MAX_OPS_PER_BATCH) {
    throw new Error("Lote de cambios inválido.");
  }
  return data.map((item): DraftOp => {
    const op = item as Record<string, unknown> | null;
    const invalid = () => new Error("Cambio inválido en el borrador.");
    if (!op || typeof op !== "object") throw invalid();
    switch (op.kind) {
      case "move": {
        const partyId = readOptionalId(op.partyId);
        const beforeId = readOptionalId(op.beforeId);
        if (!isId(op.playerId) || partyId === undefined || beforeId === undefined) throw invalid();
        return { kind: "move", playerId: op.playerId, partyId, beforeId };
      }
      case "addParty": {
        const campo = readCampo(op.campo);
        const raidId = readOptionalId(op.raidId);
        const playerId = readOptionalId(op.playerId);
        if (!isId(op.id) || campo === undefined || raidId === undefined || playerId === undefined) throw invalid();
        return { kind: "addParty", id: op.id, campo, raidId, playerId };
      }
      case "removeParty":
      case "removeRaid":
        if (!isId(op.id)) throw invalid();
        return { kind: op.kind, id: op.id };
      case "renameParty":
      case "renameRaid": {
        const name = readName(op.name);
        if (!isId(op.id) || name === null) throw invalid();
        return { kind: op.kind, id: op.id, name };
      }
      case "addRaid": {
        const campo = readCampo(op.campo);
        if (!isId(op.id) || campo === undefined) throw invalid();
        return { kind: "addRaid", id: op.id, campo };
      }
      case "moveParty": {
        const campo = readCampo(op.campo);
        const raidId = readOptionalId(op.raidId);
        const beforeId = readOptionalId(op.beforeId);
        if (!isId(op.id) || campo === undefined || raidId === undefined || beforeId === undefined) throw invalid();
        return { kind: "moveParty", id: op.id, campo, raidId, beforeId };
      }
      case "lockParty": {
        const savedPartyId = op.savedPartyId === undefined ? undefined : readOptionalId(op.savedPartyId);
        if (!isId(op.id) || typeof op.locked !== "boolean") throw invalid();
        if (op.savedPartyId !== undefined && savedPartyId === undefined) throw invalid();
        return { kind: "lockParty", id: op.id, locked: op.locked, savedPartyId };
      }
      case "addSavedParty": {
        const campo = readCampo(op.campo);
        const raidId = readOptionalId(op.raidId);
        const name = readName(op.name);
        const playerIds = readPlayerIds(op.playerIds, PARTY_SIZE);
        if (!isId(op.id) || !isId(op.savedPartyId) || campo === undefined || raidId === undefined) throw invalid();
        if (name === null || !playerIds) throw invalid();
        let people: Record<string, DraftPerson> | undefined;
        if (op.people && typeof op.people === "object") {
          people = {};
          for (const [id, person] of Object.entries(op.people as Record<string, unknown>)) {
            const data = person as Record<string, unknown> | null;
            const nickname = readName(data?.nickname);
            const clase = readName(data?.clase);
            if (isId(id) && playerIds.includes(id) && nickname !== null && clase !== null) people[id] = { nickname, clase };
          }
        }
        return { kind: "addSavedParty", id: op.id, savedPartyId: op.savedPartyId, name, campo, raidId, playerIds, people };
      }
      case "suggest": {
        const campo = readCampo(op.campo);
        const raidId = readOptionalId(op.raidId);
        if (campo === undefined || raidId === undefined || !Array.isArray(op.parties)) throw invalid();
        if (op.parties.length > MAX_PARTIES_PER_RAID) throw invalid();
        const parties = (op.parties as unknown[]).map((entry) => {
          const party = entry as Record<string, unknown> | null;
          const playerIds = readPlayerIds(party?.playerIds, PARTY_SIZE * 2);
          if (!party || !isId(party.id) || !playerIds) throw invalid();
          return { id: party.id, playerIds };
        });
        return { kind: "suggest", campo, raidId, parties };
      }
      case "replace": {
        const board = readBoard(op.board);
        if (!board) throw invalid();
        return { kind: "replace", board };
      }
      default:
        throw invalid();
    }
  });
}
