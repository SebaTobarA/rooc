"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Player, Party, Raid, SlotLabel, Role, ImportResult } from "@/types/party";
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
// llaman ahí — en cambio agrupa sus parties en raids (ver más abajo), con
// el mismo tope de 8 parties por contenedor.
const MAX_PARTIES_PER_CAMPO = 8;
const MAX_PARTIES_PER_RAID = 8;

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

interface FillResult {
  parties: Party[];
  assignments: Record<string, string>;
  roleOverrides: Record<string, Role>;
  cappedOut: boolean;
}

// Núcleo del armado por composición (rol/clase, con Lord Knight de tanque
// de emergencia, máx. 1 músico + 1 healer por party) — usado tanto por
// organizeParties (todo el pool, reemplaza todas las parties) como por
// organizeRaid (solo el pool sin asignar, agrega parties nuevas a un raid
// puntual). No toca estado de React, solo calcula.
function fillPartiesFromPool(
  pool: Player[],
  comps: SlotLabel[][],
  maxNewParties: number | undefined,
  namePrefix: string,
  startIndex: number,
  raidId: string | null
): FillResult {
  const lordKnights = pool.filter((p) => p.rol === "DPS" && isLordKnight(p.clase)).slice();
  const musicianPool = pool.filter((p) => p.rol === "Support" && isMusicianClass(p.clase)).slice();
  const healerPool = pool.filter((p) => p.rol === "Support" && isHealerClass(p.clase)).slice();
  const creatorPool = pool.filter((p) => p.rol === "Support" && isCreatorClass(p.clase)).slice();
  const byRole: Record<Role, Player[]> = {
    Tank: pool.filter((p) => p.rol === "Tank").slice(),
    DPS: pool.filter((p) => p.rol === "DPS" && !isLordKnight(p.clase)).slice(),
    Support: [],
    Flexible: pool.filter((p) => p.rol === "Flexible").slice(),
  };

  const newParties: Party[] = [];
  const assignments: Record<string, string> = {};
  const roleOverrides: Record<string, Role> = {};
  let index = startIndex;
  let cappedOut = false;

  for (;;) {
    if (maxNewParties !== undefined && newParties.length >= maxNewParties) {
      cappedOut = true;
      break;
    }

    const currentSlots = comps[newParties.length % comps.length];
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
    const party: Party = {
      id: nextId("party"),
      name: `${namePrefix} ${index}`,
      capacity: partySize,
      campo: null,
      raidId,
    };
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

  return { parties: newParties, assignments, roleOverrides, cappedOut };
}

export interface UseCampoOptions {
  maxPlayers?: number; // alerta si se supera en importación
  minPlayers?: number; // alerta si no se alcanza en organización
  maxParties?: number; // tope duro de parties (ej. 16 en Guild League = 8 por campo x 2)
}

export interface UseCampoReturn {
  players: Player[];
  parties: Party[];
  raids: Raid[];
  compositions: SlotLabel[][];
  setCompositions: (c: SlotLabel[][]) => void;
  importPlayers: (raw: string) => ImportResult;
  /** Devuelve cuántos jugadores nuevos se agregaron de verdad (excluye duplicados por id/nickname). */
  addPlayers: (players: Player[]) => number;
  loadSnapshot: (snapshot: { players: Player[]; parties: Party[]; raids?: Raid[] }) => void;
  updatePlayerClass: (playerId: string, clase: string) => void;
  organizeParties: () => string | null; // null = ok, string = error/aviso
  suggestDistribution: () => string | null; // null = ok, string = aviso
  assignPlayer: (playerId: string, partyId: string | null) => void;
  assignPartyCampo: (partyId: string, campo: Party["campo"]) => string | null; // null = ok, string = error
  distributeCampos: () => { text: string; ok: boolean };
  removePlayer: (playerId: string) => void;
  addParty: () => string | null; // null = ok, string = error
  applySavedComposition: (groups: { campo: Party["campo"]; players: Player[] }[]) => string | null;
  addRaid: (name?: string) => void;
  removeRaid: (raidId: string) => void;
  updateRaidName: (raidId: string, name: string) => void;
  updateRaidCompositions: (raidId: string, compositions: SlotLabel[][]) => void;
  assignPartyToRaid: (partyId: string, raidId: string | null) => string | null; // null = ok, string = error
  organizeRaid: (raidId: string) => string | null; // null = ok, string = error/aviso
  unassigned: Player[];
  completeCount: number;
  hasPlayers: boolean;
}

export function useCampo(initialSlots?: SlotLabel[], options: UseCampoOptions = {}): UseCampoReturn {
  const { maxPlayers, minPlayers, maxParties } = options;

  const [players, setPlayers] = useState<Player[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [raids, setRaids] = useState<Raid[]>([]);
  const [compositions, setCompositionsState] = useState<SlotLabel[][]>([
    initialSlots ?? [...DEFAULT_SLOTS],
  ]);

  const playersRef = useRef<Player[]>(players);
  const partiesRef = useRef<Party[]>(parties);
  const raidsRef = useRef<Raid[]>(raids);
  const compositionsRef = useRef<SlotLabel[][]>(compositions);
  // Los callbacks estables (useCallback sin estas deps) necesitan leer el
  // valor más reciente sin recrearse — se sincroniza en un efecto en vez de
  // durante el render, que React desaconseja mutar refs directamente ahí.
  useEffect(() => {
    playersRef.current = players;
    partiesRef.current = parties;
    raidsRef.current = raids;
    compositionsRef.current = compositions;
  });

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
  // ya resueltos desde otra fuente, ej. inscripciones a un evento de Discord
  // (ver src/lib/party/from-signups.ts) o el import por rol de Discord (ver
  // discord-role-import.tsx). Dedupea por id (discordId real en ambas
  // fuentes) además de por nickname — así, importar un rol completo después
  // de cargar los inscritos de un evento solo suma a quienes todavía no
  // están en el pool (p.ej. quienes no respondieron la encuesta de
  // asistencia) en vez de duplicarlos si su nickname cambió. Devuelve
  // cuántos se agregaron de verdad, para que el llamador pueda avisar bien
  // (ver discord-role-import.tsx).
  const addPlayers = useCallback((newPlayers: Player[]): number => {
    const existing = playersRef.current;
    const existingIds = new Set(existing.map((p) => p.id));
    const existingNicks = new Set(existing.map((p) => p.nickname.toLowerCase()));
    const toAdd: Player[] = [];
    for (const p of newPlayers) {
      if (existingIds.has(p.id) || existingNicks.has(p.nickname.toLowerCase())) continue;
      toAdd.push(p);
      existingIds.add(p.id);
      existingNicks.add(p.nickname.toLowerCase());
    }
    if (toAdd.length > 0) setPlayers((prev) => [...prev, ...toAdd]);
    return toAdd.length;
  }, []);

  // Reemplaza jugadores y parties tal cual venían en una plantilla guardada
  // (ver "Editar" en saved-templates.tsx) — a diferencia de
  // applySavedComposition, acá se preserva fidelidad exacta (mismos ids,
  // nombres, capacidades y campo) para que "Guardar cambios" no genere un
  // snapshot distinto si el usuario no tocó nada.
  const loadSnapshot = useCallback(
    (snapshot: { players: Player[]; parties: Party[]; raids?: Raid[] }) => {
      const raids = snapshot.raids ?? [];
      setPlayers(snapshot.players);
      setRaids(raids);
      // raidId no existía en plantillas guardadas antes de que se agregaran
      // los raids — sin este fallback esas parties quedarían con raidId
      // undefined en vez de null y no matchearían los chequeos `=== null`
      // que las tratan como "sin asignar a un raid". Un raidId que apunte a
      // un raid ya inexistente (plantilla a medio migrar) también se limpia,
      // porque si no la party desaparecería de la vista: no la dibujaría
      // ningún raid ni tampoco la grilla de "sin asignar".
      const knownRaidIds = new Set(raids.map((r) => r.id));
      setParties(
        snapshot.parties.map((p) => ({
          ...p,
          raidId: p.raidId && knownRaidIds.has(p.raidId) ? p.raidId : null,
        }))
      );
    },
    []
  );

  // Corrige la clase de un jugador ya importado (ej. sin clase asignada en
  // Discord) y recalcula su rol a partir de la clase nueva.
  const updatePlayerClass = useCallback((playerId: string, clase: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, clase, rol: inferRole(clase) } : p))
    );
  }, []);

  // Cicla entre composiciones. Lord Knights son DPS primario; si faltan Tanks
  // (Paladines), se usan LKs como tanques de emergencia.
  // Nunca repite clase en una misma party salvo que sea inevitable.
  const organizeParties = useCallback((): string | null => {
    const all = playersRef.current;

    if (minPlayers !== undefined && all.length < minPlayers) {
      return `Se necesitan al menos ${minPlayers} jugadores para organizar parties (actualmente hay ${all.length}).`;
    }

    const result = fillPartiesFromPool(all, compositionsRef.current, maxParties, "Party", 0, null);

    if (result.parties.length === 0) {
      return "No hay suficientes jugadores para armar al menos una party con esa composición.";
    }

    setParties(result.parties);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        partyId: result.assignments[p.id] ?? null,
        ...(result.roleOverrides[p.id] ? { rol: result.roleOverrides[p.id] } : {}),
      }))
    );

    if (result.cappedOut) {
      const leftover = all.length - Object.keys(result.assignments).length;
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
        raidId: null,
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

  // Reparto automático de las parties todavía sin campo ("Distribuir
  // campos" en campo-assignment.tsx): prioriza las completas hacia Campo
  // Principal y llena hasta 8 por campo. Si hay pocas parties en total
  // (menos de 6) evita volcarlas todas a un mismo campo — reparte ~80/20
  // en su lugar (ej. 6 parties -> 4 y 2). No toca parties que ya tengan
  // campo asignado a mano.
  const distributeCampos = useCallback((): { text: string; ok: boolean } => {
    const staged = partiesRef.current.filter((p) => !p.campo);
    if (staged.length === 0) {
      return { text: "No hay parties sin asignar a un campo.", ok: false };
    }

    const membersCount = (party: Party) =>
      playersRef.current.filter((p) => p.partyId === party.id).length;
    const isComplete = (party: Party) => membersCount(party) >= party.capacity;

    // Completas primero — así son las primeras en entrar a Campo Principal.
    const sorted = [...staged].sort((a, b) => Number(isComplete(b)) - Number(isComplete(a)));

    const capPrincipal = MAX_PARTIES_PER_CAMPO - partiesRef.current.filter((p) => p.campo === "principal").length;
    const capSecundario =
      MAX_PARTIES_PER_CAMPO - partiesRef.current.filter((p) => p.campo === "secundario").length;

    const total = sorted.length;
    const desiredPrincipal = total < 6 ? Math.floor(total * 0.8) : total;

    const wantPrincipal = Math.max(0, Math.min(desiredPrincipal, capPrincipal));
    const remaining = total - wantPrincipal;
    const wantSecundario = Math.max(0, Math.min(remaining, capSecundario));
    const leftover = total - wantPrincipal - wantSecundario;

    const assignments = new Map<string, "principal" | "secundario">();
    sorted.slice(0, wantPrincipal).forEach((p) => assignments.set(p.id, "principal"));
    sorted.slice(wantPrincipal, wantPrincipal + wantSecundario).forEach((p) => assignments.set(p.id, "secundario"));

    setParties((prev) => prev.map((p) => (assignments.has(p.id) ? { ...p, campo: assignments.get(p.id)! } : p)));

    const text =
      leftover > 0
        ? `Se distribuyeron ${wantPrincipal} party(s) a Campo Principal y ${wantSecundario} a Campo Secundario — ${leftover} quedaron sin asignar porque ambos campos están al límite.`
        : `Se distribuyeron ${wantPrincipal} party(s) a Campo Principal y ${wantSecundario} a Campo Secundario.`;
    return { text, ok: leftover === 0 };
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
      { id: nextId("party"), name: `Party ${prev.length + 1}`, capacity: 12, campo: null, raidId: null },
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
          raidId: null,
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

  const addRaid = useCallback((name?: string) => {
    setRaids((prev) => [
      ...prev,
      { id: nextId("raid"), name: name?.trim() || `Raid ${prev.length + 1}`, compositions: [[...DEFAULT_SLOTS]] },
    ]);
  }, []);

  const removeRaid = useCallback((raidId: string) => {
    setRaids((prev) => prev.filter((r) => r.id !== raidId));
    setParties((prev) => prev.map((p) => (p.raidId === raidId ? { ...p, raidId: null } : p)));
  }, []);

  const updateRaidName = useCallback((raidId: string, name: string) => {
    setRaids((prev) => prev.map((r) => (r.id === raidId ? { ...r, name } : r)));
  }, []);

  const updateRaidCompositions = useCallback((raidId: string, comps: SlotLabel[][]) => {
    setRaids((prev) =>
      prev.map((r) => (r.id === raidId ? { ...r, compositions: comps.length > 0 ? comps : [[...DEFAULT_SLOTS]] } : r))
    );
  }, []);

  // Asigna (o quita, con raidId null) una party completa a un raid — mismo
  // criterio de tope que assignPartyCampo, pero contra la lista dinámica de
  // raids en vez de los dos campos fijos.
  const assignPartyToRaid = useCallback((partyId: string, raidId: string | null): string | null => {
    if (raidId !== null) {
      const countInRaid = partiesRef.current.filter((p) => p.raidId === raidId && p.id !== partyId).length;
      if (countInRaid >= MAX_PARTIES_PER_RAID) {
        const raid = raidsRef.current.find((r) => r.id === raidId);
        return `${raid?.name ?? "Ese raid"} ya tiene ${MAX_PARTIES_PER_RAID} parties — ese es el máximo.`;
      }
    }
    setParties((prev) => prev.map((p) => (p.id === partyId ? { ...p, raidId } : p)));
    return null;
  }, []);

  // Arma parties nuevas directo dentro de un raid, usando SU composición
  // propia — a diferencia de organizeParties (que reemplaza TODAS las
  // parties usando la composición global), esto solo toma del pool sin
  // asignar y agrega, sin tocar nada que ya esté organizado en otro lado.
  const organizeRaid = useCallback((raidId: string): string | null => {
    const raid = raidsRef.current.find((r) => r.id === raidId);
    if (!raid) return "Ese raid ya no existe.";

    const currentCount = partiesRef.current.filter((p) => p.raidId === raidId).length;
    const capacity = MAX_PARTIES_PER_RAID - currentCount;
    if (capacity <= 0) {
      return `${raid.name} ya tiene ${MAX_PARTIES_PER_RAID} parties — ese es el máximo.`;
    }

    const pool = playersRef.current.filter((p) => !p.partyId);
    if (pool.length === 0) {
      return "No hay jugadores sin asignar para organizar este raid.";
    }

    const result = fillPartiesFromPool(pool, raid.compositions, capacity, `${raid.name} - Party`, currentCount, raidId);
    if (result.parties.length === 0) {
      return "No hay suficientes jugadores sin asignar para armar al menos una party con esa composición.";
    }

    setParties((prev) => [...prev, ...result.parties]);
    setPlayers((prev) =>
      prev.map((p) =>
        result.assignments[p.id]
          ? { ...p, partyId: result.assignments[p.id], ...(result.roleOverrides[p.id] ? { rol: result.roleOverrides[p.id] } : {}) }
          : p
      )
    );

    if (result.cappedOut) {
      return `${raid.name} llegó al máximo de ${MAX_PARTIES_PER_RAID} parties — algunos jugadores sin asignar quedaron pendientes.`;
    }
    return null;
  }, []);

  return {
    players,
    parties,
    raids,
    compositions,
    setCompositions,
    importPlayers,
    addPlayers,
    loadSnapshot,
    updatePlayerClass,
    organizeParties,
    suggestDistribution,
    assignPlayer,
    assignPartyCampo,
    distributeCampos,
    removePlayer,
    addParty,
    applySavedComposition,
    addRaid,
    removeRaid,
    updateRaidName,
    updateRaidCompositions,
    assignPartyToRaid,
    organizeRaid,
    unassigned,
    completeCount,
    hasPlayers,
  };
}
