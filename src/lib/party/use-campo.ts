"use client";

import { useState, useCallback, useRef } from "react";
import type { Player, Party, SlotLabel, Role, ImportResult } from "@/types/party";
import { parseEntries } from "@/lib/party/parse-entries";
import {
  inferRole,
  isLordKnight,
  isMusicianClass,
  isHealerClass,
  isCreatorClass,
  normalizeClass,
} from "@/lib/party/infer-role";

export const DEFAULT_SLOTS: SlotLabel[] = ["Tanque", "Soporte", "Daño", "Daño", "Daño"];

const SLOT_TO_ROLE: Record<SlotLabel, Role> = {
  Tanque: "Tank",
  Soporte: "Support",
  Daño: "DPS",
  Flexible: "Flexible",
};

const ROLE_ORDER: Record<Role, number> = {
  Tank: 0,
  Support: 1,
  DPS: 2,
  Flexible: 3,
};

// 16 parties totales en Guild League = 8 por campo. Emperium Overrun no
// tiene campos, así que assignPartyCampo/applySavedComposition nunca se
// llaman ahí.
const MAX_PARTIES_PER_CAMPO = 8;

const uidRef = { current: 0 };
function nextId(prefix: string): string {
  return `${prefix}_${++uidRef.current}`;
}

function computeQuota(slots: SlotLabel[]): Record<Role, number> {
  const quota: Record<Role, number> = { Tank: 0, DPS: 0, Support: 0, Flexible: 0 };
  slots.forEach((l) => {
    quota[SLOT_TO_ROLE[l]]++;
  });
  return quota;
}

// Toma el primer jugador cuya clase no esté ya en la party.
// Si todos tienen clase repetida, deja el slot vacío (undefined) para que la
// party quede incompleta en lugar de meter duplicados.
function pickUnique(pool: Player[], usedClasses: Set<string>): Player | undefined {
  const idx = pool.findIndex((p) => !usedClasses.has(p.clase.toLowerCase()));
  if (idx !== -1) {
    const [p] = pool.splice(idx, 1);
    usedClasses.add(p.clase.toLowerCase());
    return p;
  }
  return undefined;
}

export interface UseCampoOptions {
  maxPlayers?: number; // alerta si se supera en importación
  minPlayers?: number; // alerta si no se alcanza en organización
  maxParties?: number; // tope duro de parties (ej. 16 en Guild League = 8 por campo x 2)
}

export interface UseCampoReturn {
  players: Player[];
  parties: Party[];
  compositions: SlotLabel[][];
  setCompositions: (c: SlotLabel[][]) => void;
  importPlayers: (raw: string) => ImportResult;
  addPlayers: (players: Player[]) => void;
  organizeParties: () => string | null; // null = ok, string = error/aviso
  suggestDistribution: () => string | null; // null = ok, string = aviso
  assignPlayer: (playerId: string, partyId: string | null) => void;
  assignPartyCampo: (partyId: string, campo: Party["campo"]) => string | null; // null = ok, string = error
  removePlayer: (playerId: string) => void;
  addParty: () => string | null; // null = ok, string = error
  applySavedComposition: (groups: { campo: Party["campo"]; players: Player[] }[]) => string | null;
  unassigned: Player[];
  completeCount: number;
  hasPlayers: boolean;
}

export function useCampo(initialSlots?: SlotLabel[], options: UseCampoOptions = {}): UseCampoReturn {
  const { maxPlayers, minPlayers, maxParties } = options;

  const [players, setPlayers] = useState<Player[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [compositions, setCompositionsState] = useState<SlotLabel[][]>([
    initialSlots ?? [...DEFAULT_SLOTS],
  ]);

  const playersRef = useRef<Player[]>(players);
  const partiesRef = useRef<Party[]>(parties);
  const compositionsRef = useRef<SlotLabel[][]>(compositions);
  playersRef.current = players;
  partiesRef.current = parties;
  compositionsRef.current = compositions;

  const unassigned = players.filter((p) => !p.partyId);
  const hasPlayers = players.length > 0;

  const completeCount = parties.filter((party) => {
    const members = players.filter((p) => p.partyId === party.id);
    return (
      members.length > 0 &&
      members.some((m) => m.rol === "Tank") &&
      members.some((m) => m.rol === "Support")
    );
  }).length;

  const setCompositions = useCallback((c: SlotLabel[][]) => {
    setCompositionsState(c.length > 0 ? c : [[...DEFAULT_SLOTS]]);
  }, []);

  const importPlayers = useCallback(
    (raw: string): ImportResult => {
      const existing = playersRef.current;

      // Límite máximo de jugadores por campo
      if (maxPlayers !== undefined && existing.length >= maxPlayers) {
        return {
          added: 0,
          skipped: [],
          limitError: `Este campo tiene un límite de ${maxPlayers} jugadores y ya está lleno.`,
        };
      }

      const entries = parseEntries(raw);
      const added: Player[] = [];
      const skipped: string[] = [];
      const slotsLeft = maxPlayers !== undefined ? maxPlayers - existing.length : Infinity;

      for (const entry of entries) {
        if (added.length >= slotsLeft) {
          skipped.push(`(límite alcanzado — máx. ${maxPlayers} jugadores)`);
          break;
        }
        const parts = entry.split(",").map((s) => s.trim());
        if (parts.length < 2 || !parts[0] || !parts[1]) {
          skipped.push(entry || "(vacío)");
          continue;
        }
        const [nick, rawClase] = parts;
        const clase = normalizeClass(rawClase);
        const isDuplicate =
          added.some((a) => a.nickname.toLowerCase() === nick.toLowerCase()) ||
          existing.some((p) => p.nickname.toLowerCase() === nick.toLowerCase());

        if (isDuplicate) {
          skipped.push(`${nick} (duplicado)`);
          continue;
        }

        added.push({
          id: nextId("player"),
          nickname: nick,
          clase,
          rol: inferRole(clase),
          partyId: null,
        });
      }

      if (added.length > 0) {
        setPlayers((prev) => [...prev, ...added]);
      }

      const limitError =
        maxPlayers !== undefined && existing.length + added.length >= maxPlayers
          ? `Se alcanzó el límite de ${maxPlayers} jugadores para este campo.`
          : undefined;

      return { added: added.length, skipped, limitError };
    },
    [maxPlayers]
  );

  // Alta directa (sin pasar por parseEntries) — usada para cargar jugadores
  // ya resueltos desde otra fuente, ej. inscripciones a un evento de
  // Discord (ver src/lib/party/from-signups.ts). Mismo dedupe por nickname
  // que importPlayers, sin el límite de maxPlayers ni el parseo de texto.
  const addPlayers = useCallback((newPlayers: Player[]) => {
    setPlayers((prev) => {
      const existingNicks = new Set(prev.map((p) => p.nickname.toLowerCase()));
      const toAdd = newPlayers.filter((p) => !existingNicks.has(p.nickname.toLowerCase()));
      return [...prev, ...toAdd];
    });
  }, []);

  // Cicla entre composiciones. Lord Knights son DPS primario; si faltan Tanks
  // (Paladines), se usan LKs como tanques de emergencia.
  // Nunca repite clase en una misma party salvo que sea inevitable.
  const organizeParties = useCallback((): string | null => {
    const all = playersRef.current;

    if (minPlayers !== undefined && all.length < minPlayers) {
      return `Se necesitan al menos ${minPlayers} jugadores para organizar parties (actualmente hay ${all.length}).`;
    }

    const comps = compositionsRef.current;

    const lordKnights = all.filter((p) => p.rol === "DPS" && isLordKnight(p.clase)).slice();
    const musicianPool = all.filter((p) => p.rol === "Support" && isMusicianClass(p.clase)).slice();
    const healerPool = all.filter((p) => p.rol === "Support" && isHealerClass(p.clase)).slice();
    const creatorPool = all.filter((p) => p.rol === "Support" && isCreatorClass(p.clase)).slice();
    const byRole: Record<Role, Player[]> = {
      Tank: all.filter((p) => p.rol === "Tank").slice(),
      DPS: all.filter((p) => p.rol === "DPS" && !isLordKnight(p.clase)).slice(),
      Support: [],
      Flexible: all.filter((p) => p.rol === "Flexible").slice(),
    };

    const newParties: Party[] = [];
    const assignments: Record<string, string> = {};
    const roleOverrides: Record<string, Role> = {};
    let index = 0;
    let cappedOut = false;

    for (;;) {
      if (maxParties !== undefined && newParties.length >= maxParties) {
        cappedOut = true;
        break;
      }

      const currentSlots = comps[index % comps.length];
      const quota = computeQuota(currentSlots);
      const partySize = currentSlots.length;

      const remaining =
        byRole.Tank.length +
        byRole.DPS.length +
        lordKnights.length +
        musicianPool.length +
        healerPool.length +
        creatorPool.length +
        byRole.Flexible.length;

      if (remaining === 0) break;

      // Detener cuando ya no hay jugadores para los roles esenciales (Tank / Soporte).
      // Los DPS sobrantes quedan sin asignar para que "Sugerir distribución" los coloque.
      const hasEssentialTank = quota.Tank === 0 || byRole.Tank.length + lordKnights.length > 0;
      const supportLeft = musicianPool.length + healerPool.length + creatorPool.length;
      const hasEssentialSupport = quota.Support === 0 || supportLeft > 0;

      if (!hasEssentialTank || !hasEssentialSupport) break;

      index++;
      const party: Party = { id: nextId("party"), name: `Party ${index}`, capacity: partySize, campo: null };
      const usedClasses = new Set<string>();

      // Tank: Paladines primero, LKs de emergencia
      for (let i = 0; i < quota.Tank; i++) {
        const real = pickUnique(byRole.Tank, usedClasses);
        if (real) {
          assignments[real.id] = party.id;
        } else {
          const lk = pickUnique(lordKnights, usedClasses);
          if (lk) {
            assignments[lk.id] = party.id;
            roleOverrides[lk.id] = "Tank";
          }
        }
      }

      // Soporte: max 1 músico + max 1 healer por party; Creator como comodín
      let usedMusician = false;
      let usedHealer = false;
      for (let i = 0; i < quota.Support; i++) {
        let p: Player | undefined;
        if (!usedMusician && musicianPool.length > 0) {
          p = pickUnique(musicianPool, usedClasses);
          usedMusician = true;
        } else if (!usedHealer && healerPool.length > 0) {
          p = pickUnique(healerPool, usedClasses);
          usedHealer = true;
        } else {
          p = pickUnique(creatorPool, usedClasses);
        }
        if (p) assignments[p.id] = party.id;
      }

      // DPS: regulares primero, LKs restantes
      for (let i = 0; i < quota.DPS; i++) {
        const p = pickUnique(byRole.DPS, usedClasses) ?? pickUnique(lordKnights, usedClasses);
        if (p) assignments[p.id] = party.id;
      }

      // Flexible: Creators de comodín, luego el resto
      for (let i = 0; i < quota.Flexible; i++) {
        const p =
          pickUnique(byRole.Flexible, usedClasses) ??
          pickUnique(creatorPool, usedClasses) ??
          pickUnique(byRole.DPS, usedClasses) ??
          pickUnique(lordKnights, usedClasses) ??
          pickUnique(musicianPool, usedClasses) ??
          pickUnique(healerPool, usedClasses) ??
          pickUnique(byRole.Tank, usedClasses);
        if (p) assignments[p.id] = party.id;
      }

      newParties.push(party);
    }

    if (newParties.length === 0) {
      return "No hay suficientes jugadores para armar al menos una party con esa composición.";
    }

    setParties(newParties);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        partyId: assignments[p.id] ?? null,
        ...(roleOverrides[p.id] ? { rol: roleOverrides[p.id] } : {}),
      }))
    );

    if (cappedOut) {
      const leftover = all.length - Object.keys(assignments).length;
      if (leftover > 0) {
        return `Se alcanzó el límite de ${maxParties} parties — ${leftover} jugador(es) quedaron sin asignar.`;
      }
    }

    return null;
  }, [minPlayers, maxParties]);

  const suggestDistribution = useCallback((): string | null => {
    const unassignedPlayers = playersRef.current.filter((p) => !p.partyId);
    if (!unassignedPlayers.length) return null;

    const targetSize = Math.max(1, compositionsRef.current[0].length);
    let numGroups = Math.ceil(unassignedPlayers.length / targetSize);

    const existingCount = partiesRef.current.length;
    let cappedMsg: string | null = null;
    if (maxParties !== undefined && existingCount + numGroups > maxParties) {
      numGroups = Math.max(0, maxParties - existingCount);
      cappedMsg = `Se alcanzó el límite de ${maxParties} parties — algunos jugadores quedaron sin asignar.`;
    }
    if (numGroups === 0) return cappedMsg;

    // Ordena por rol y luego por clase para que el round-robin reparta clases
    // iguales entre grupos distintos en vez de agruparlas en el mismo.
    const sorted = [...unassignedPlayers].sort((a, b) => {
      const roleOrder = ROLE_ORDER[a.rol] - ROLE_ORDER[b.rol];
      if (roleOrder !== 0) return roleOrder;
      return a.clase.localeCompare(b.clase);
    });

    // Si el tope de parties obliga a reducir numGroups, solo entran los
    // primeros (numGroups * targetSize) jugadores — el resto queda sin
    // asignar en vez de sobrecargar cada grupo por encima de su capacidad.
    const toPlace = cappedMsg ? sorted.slice(0, numGroups * targetSize) : sorted;

    const groups: Player[][] = Array.from({ length: numGroups }, () => []);
    toPlace.forEach((p, i) => groups[i % numGroups].push(p));

    const newParties: Party[] = [];
    const assignments: Record<string, string> = {};

    groups.forEach((group, gi) => {
      if (!group.length) return;
      const party: Party = {
        id: nextId("party"),
        name: `Party ${existingCount + gi + 1} (sugerida)`,
        capacity: targetSize,
        campo: null,
      };
      newParties.push(party);
      group.forEach((p) => {
        assignments[p.id] = party.id;
      });
    });

    setParties((prev) => [...prev, ...newParties]);
    setPlayers((prev) => prev.map((p) => ({ ...p, partyId: assignments[p.id] ?? p.partyId })));

    return cappedMsg;
  }, [maxParties]);

  const assignPlayer = useCallback((playerId: string, partyId: string | null) => {
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, partyId } : p)));
  }, []);

  // Asigna una party completa a un campo (Guild League) — ver
  // campo-assignment.tsx, que es el único llamador real; Emperium Overrun
  // no tiene campos y nunca llama esto.
  const assignPartyCampo = useCallback((partyId: string, campo: Party["campo"]): string | null => {
    if (campo !== null) {
      const countInCampo = partiesRef.current.filter((p) => p.campo === campo && p.id !== partyId).length;
      if (countInCampo >= MAX_PARTIES_PER_CAMPO) {
        const label = campo === "principal" ? "Campo Principal" : "Campo Secundario";
        return `${label} ya tiene ${MAX_PARTIES_PER_CAMPO} parties — ese es el máximo.`;
      }
    }
    setParties((prev) => prev.map((p) => (p.id === partyId ? { ...p, campo } : p)));
    return null;
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  const addParty = useCallback((): string | null => {
    if (maxParties !== undefined && partiesRef.current.length >= maxParties) {
      return `Se alcanzó el límite de ${maxParties} parties.`;
    }
    setParties((prev) => [
      ...prev,
      { id: nextId("party"), name: `Party ${prev.length + 1}`, capacity: 12, campo: null },
    ]);
    return null;
  }, [maxParties]);

  // Recrea la agrupación de una plantilla guardada anterior, para los
  // jugadores del evento actual que coinciden (por id = discordId) con esa
  // plantilla — ver "Usar última composición guardada" en guild-league.tsx.
  // Cada grupo mantiene el campo que tenía, salvo que ese campo ya esté
  // lleno (8 parties), en cuyo caso queda sin asignar en vez de romper el
  // tope.
  const applySavedComposition = useCallback(
    (groups: { campo: Party["campo"]; players: Player[] }[]): string | null => {
      const nonEmptyGroups = groups.filter((g) => g.players.length > 0);
      const existingCount = partiesRef.current.length;

      let groupsToApply = nonEmptyGroups;
      let cappedMsg: string | null = null;
      if (maxParties !== undefined && existingCount + nonEmptyGroups.length > maxParties) {
        const allowed = Math.max(0, maxParties - existingCount);
        groupsToApply = nonEmptyGroups.slice(0, allowed);
        cappedMsg = `Se alcanzó el límite de ${maxParties} parties — algunos grupos de la composición anterior no se pudieron recrear.`;
      }
      if (groupsToApply.length === 0) return cappedMsg;

      const sideCounts: Record<"principal" | "secundario", number> = {
        principal: partiesRef.current.filter((p) => p.campo === "principal").length,
        secundario: partiesRef.current.filter((p) => p.campo === "secundario").length,
      };

      const newParties: Party[] = [];
      const assignments: Record<string, string> = {};

      groupsToApply.forEach((group, gi) => {
        let campo = group.campo;
        if (campo && sideCounts[campo] >= MAX_PARTIES_PER_CAMPO) campo = null;
        if (campo) sideCounts[campo]++;

        const party: Party = {
          id: nextId("party"),
          name: `Party ${existingCount + gi + 1}`,
          capacity: group.players.length,
          campo,
        };
        newParties.push(party);
        group.players.forEach((p) => {
          assignments[p.id] = party.id;
        });
      });

      setParties((prev) => [...prev, ...newParties]);
      setPlayers((prev) => prev.map((p) => (assignments[p.id] ? { ...p, partyId: assignments[p.id] } : p)));

      return cappedMsg;
    },
    [maxParties]
  );

  return {
    players,
    parties,
    compositions,
    setCompositions,
    importPlayers,
    addPlayers,
    organizeParties,
    suggestDistribution,
    assignPlayer,
    assignPartyCampo,
    removePlayer,
    addParty,
    applySavedComposition,
    unassigned,
    completeCount,
    hasPlayers,
  };
}
