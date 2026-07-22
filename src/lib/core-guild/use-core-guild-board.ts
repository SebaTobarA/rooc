"use client";

import { useCallback, useMemo, useState } from "react";
import type { SlotLabel } from "@/types/party";
import type { CoreGuild, CoreGuildBoardData, CoreMember, CorePartySlot } from "./types";
import type { CoreGuildRosterEntry } from "./sync";
import { organizeCoreParties } from "./organize";
import { saveCoreGuildBoard, unlockCoreGuildBoard } from "@/lib/actions/core-guild";

const DEFAULT_COMPOSITION: SlotLabel[] = ["Tanque", "Soporte", "Daño", "Daño", "Daño"];

export interface SavedCoreGuildBoard {
  data: CoreGuildBoardData;
  locked: boolean;
  updatedByUsername: string | null;
  updatedAt: string;
}

function emptyBoard(): CoreGuildBoardData {
  return { members: [], parties: [], compositions: [[...DEFAULT_COMPOSITION]], guilds: [] };
}

// Mezcla el roster fresco de Discord con lo último guardado: los miembros
// que ya estaban guardados conservan sus campos editables (jobRole,
// grupo/etiqueta, wallet, party), solo se refrescan nick/avatar; los que
// aparecen nuevos en Discord se agregan con valores por defecto; los que ya
// no tienen el rol Core quedan marcados `inCore: false` en vez de
// desaparecer, para que el admin decida a mano si los saca.
function reconcileMembers(roster: CoreGuildRosterEntry[], saved: CoreMember[]): CoreMember[] {
  const savedById = new Map(saved.map((m) => [m.discordId, m]));
  const rosterIds = new Set(roster.map((r) => r.discordId));

  const merged: CoreMember[] = roster.map((entry) => {
    const existing = savedById.get(entry.discordId);
    if (existing) {
      return {
        ...existing,
        username: entry.username,
        globalName: entry.globalName,
        nick: entry.nick,
        avatarHash: entry.avatarHash,
        inCore: true,
      };
    }
    return {
      discordId: entry.discordId,
      username: entry.username,
      globalName: entry.globalName,
      nick: entry.nick,
      avatarHash: entry.avatarHash,
      jobRole: entry.suggestedJobRole ?? "",
      groupMode: "SOLO" as const,
      groupTag: "",
      walletType: "F2P" as const,
      inCore: true,
      partyId: null,
    };
  });

  saved.forEach((m) => {
    if (!rosterIds.has(m.discordId)) merged.push({ ...m, inCore: false });
  });

  return merged;
}

export function useCoreGuildBoard(roster: CoreGuildRosterEntry[], saved: SavedCoreGuildBoard | null) {
  const initial = useMemo<CoreGuildBoardData>(() => {
    const base = saved?.data ?? emptyBoard();
    return {
      members: reconcileMembers(roster, base.members ?? []),
      // `locked` no existía en boards guardados antes de esta funcionalidad.
      parties: (base.parties ?? []).map((p) => ({ ...p, locked: p.locked ?? false })),
      compositions: base.compositions?.length ? base.compositions : [[...DEFAULT_COMPOSITION]],
      guilds: base.guilds ?? [],
    };
    // Solo se recalcula al montar — reconciliar de nuevo en cada render
    // pisaría ediciones en curso del admin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [members, setMembers] = useState<CoreMember[]>(initial.members);
  const [parties, setParties] = useState<CorePartySlot[]>(initial.parties);
  const [compositions, setCompositions] = useState<SlotLabel[][]>(initial.compositions);
  const [guilds, setGuilds] = useState<CoreGuild[]>(initial.guilds);
  const [locked, setLocked] = useState(saved?.locked ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeMembers = members.filter((m) => m.inCore);
  const unassigned = activeMembers.filter((m) => !m.partyId);

  const updateMember = useCallback((discordId: string, patch: Partial<CoreMember>) => {
    setMembers((prev) => prev.map((m) => (m.discordId === discordId ? { ...m, ...patch } : m)));
  }, []);

  const removeMember = useCallback((discordId: string) => {
    setMembers((prev) => prev.filter((m) => m.discordId !== discordId));
  }, []);

  const assignToParty = useCallback((discordId: string, partyId: string | null) => {
    setMembers((prev) => prev.map((m) => (m.discordId === discordId ? { ...m, partyId } : m)));
  }, []);

  const addParty = useCallback(() => {
    setParties((prev) => [
      ...prev,
      {
        id: `core_party_manual_${prev.length + 1}_${Date.now().toString(36)}`,
        name: `Party ${prev.length + 1}`,
        capacity: compositions[0]?.length ?? 5,
        locked: false,
      },
    ]);
  }, [compositions]);

  const removeParty = useCallback((partyId: string) => {
    setParties((prev) => prev.filter((p) => p.id !== partyId));
    setMembers((prev) => prev.map((m) => (m.partyId === partyId ? { ...m, partyId: null } : m)));
    setGuilds((prev) => prev.map((g) => ({ ...g, partyIds: g.partyIds.filter((id) => id !== partyId) })));
  }, []);

  const togglePartyLocked = useCallback((partyId: string) => {
    setParties((prev) => prev.map((p) => (p.id === partyId ? { ...p, locked: !p.locked } : p)));
  }, []);

  const updatePartyName = useCallback((partyId: string, name: string) => {
    setParties((prev) => prev.map((p) => (p.id === partyId ? { ...p, name } : p)));
  }, []);

  // Borra todas las parties SIN bloquear (las "lista" quedan intactas, con
  // sus miembros) y devuelve a sus miembros al pool de "sin asignar".
  const clearParties = useCallback(() => {
    const removedIds = new Set(parties.filter((p) => !p.locked).map((p) => p.id));
    if (removedIds.size === 0) return;
    setParties((prev) => prev.filter((p) => p.locked));
    setMembers((prev) =>
      prev.map((m) => (m.partyId && removedIds.has(m.partyId) ? { ...m, partyId: null } : m))
    );
    setGuilds((prev) => prev.map((g) => ({ ...g, partyIds: g.partyIds.filter((id) => !removedIds.has(id)) })));
  }, [parties]);

  // Las parties marcadas "lista" (locked) no se tocan: ni a ellas ni a sus
  // miembros. organizeCoreParties solo corre sobre el resto (sin asignar +
  // miembros de parties todavía no bloqueadas), y el resultado se agrega a
  // las bloqueadas en vez de reemplazarlas.
  const organize = useCallback(() => {
    const lockedParties = parties.filter((p) => p.locked);
    const lockedPartyIds = new Set(lockedParties.map((p) => p.id));
    const lockedMemberIds = new Set(
      members.filter((m) => m.partyId && lockedPartyIds.has(m.partyId)).map((m) => m.discordId)
    );
    const poolMembers = members.filter((m) => !lockedMemberIds.has(m.discordId));

    const result = organizeCoreParties(poolMembers, compositions);
    const newParties = [...lockedParties, ...result.parties];
    const validIds = new Set(newParties.map((p) => p.id));

    setParties(newParties);
    setMembers((prev) =>
      prev.map((m) =>
        lockedMemberIds.has(m.discordId) ? m : { ...m, partyId: result.assignments[m.discordId] ?? null }
      )
    );
    setGuilds((prev) => prev.map((g) => ({ ...g, partyIds: g.partyIds.filter((id) => validIds.has(id)) })));
  }, [members, compositions, parties]);

  const addGuild = useCallback((name: string, level: number, cap: number) => {
    setGuilds((prev) => [
      ...prev,
      { id: `core_guild_${prev.length + 1}_${Date.now().toString(36)}`, name, level, cap, partyIds: [] },
    ]);
  }, []);

  const updateGuild = useCallback(
    (guildId: string, patch: Partial<Omit<CoreGuild, "id" | "partyIds">>) => {
      setGuilds((prev) => prev.map((g) => (g.id === guildId ? { ...g, ...patch } : g)));
    },
    []
  );

  const removeGuild = useCallback((guildId: string) => {
    setGuilds((prev) => prev.filter((g) => g.id !== guildId));
  }, []);

  const assignPartyToGuild = useCallback((partyId: string, guildId: string | null) => {
    setGuilds((prev) =>
      prev.map((g) => {
        const withoutParty = g.partyIds.filter((id) => id !== partyId);
        return g.id === guildId ? { ...g, partyIds: [...withoutParty, partyId] } : { ...g, partyIds: withoutParty };
      })
    );
  }, []);

  const guildIdForParty = useCallback(
    (partyId: string) => guilds.find((g) => g.partyIds.includes(partyId))?.id ?? null,
    [guilds]
  );

  async function save() {
    setSaving(true);
    setError("");
    try {
      await saveCoreGuildBoard({ members, parties, compositions, guilds });
      setLocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function unlock() {
    setSaving(true);
    setError("");
    try {
      await unlockCoreGuildBoard();
      setLocked(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desbloquear.");
    } finally {
      setSaving(false);
    }
  }

  return {
    members,
    activeMembers,
    unassigned,
    parties,
    compositions,
    setCompositions,
    guilds,
    locked,
    saving,
    error,
    updateMember,
    removeMember,
    assignToParty,
    addParty,
    removeParty,
    togglePartyLocked,
    updatePartyName,
    clearParties,
    organize,
    addGuild,
    updateGuild,
    removeGuild,
    assignPartyToGuild,
    guildIdForParty,
    save,
    unlock,
  };
}

export type UseCoreGuildBoardReturn = ReturnType<typeof useCoreGuildBoard>;
