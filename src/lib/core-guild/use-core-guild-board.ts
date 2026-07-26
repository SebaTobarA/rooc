"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { emptyCoreGuildBoardData, type CoreGuild, type CoreGuildBoardData, type CoreMember, type CorePartySlot } from "./types";
import { reconcileMembers } from "./reconcile";
import { organizeCoreGroups } from "./organize";
import { saveCoreGuildBoard, unlockCoreGuildBoard } from "@/lib/actions/core-guild";
import { getCoreGuildMembersSnapshot } from "@/lib/actions/core-guild-members";
import type { CoreGuildRosterEntry } from "./sync";

export interface SavedCoreGuildBoard {
  data: CoreGuildBoardData;
  locked: boolean;
  updatedByUsername: string | null;
  updatedAt: string;
}

// Cada cuánto se refresca members en segundo plano para reflejar ediciones
// de la sección Miembros Core (independiente, autoguardada) o respuestas
// nuevas de la encuesta — sin esto, "Organización de Grupos" solo vería
// etiquetas frescas después de recargar la página entera.
const MEMBER_POLL_MS = 6000;

export function useCoreGuildBoard(roster: CoreGuildRosterEntry[], saved: SavedCoreGuildBoard | null) {
  const initial = useMemo<CoreGuildBoardData>(() => {
    const empty = emptyCoreGuildBoardData();
    const base = saved?.data ?? empty;
    return {
      members: reconcileMembers(roster, base.members ?? []),
      // `locked` no existía en boards guardados antes de esta funcionalidad.
      parties: (base.parties ?? []).map((p) => ({ ...p, locked: p.locked ?? false })),
      guilds: base.guilds ?? [],
      // `teamRoles` tampoco existía antes de esta funcionalidad.
      teamRoles: base.teamRoles ?? {},
      // ni `surveyMessage`.
      surveyMessage: base.surveyMessage ?? null,
    };
    // Solo se recalcula al montar — reconciliar de nuevo en cada render
    // pisaría ediciones en curso del admin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [members, setMembers] = useState<CoreMember[]>(initial.members);
  const [parties, setParties] = useState<CorePartySlot[]>(initial.parties);
  const [guilds, setGuilds] = useState<CoreGuild[]>(initial.guilds);
  const [teamRoles, setTeamRoles] = useState<Record<string, string>>(initial.teamRoles);
  // Nunca se edita desde la UI — se conserva tal cual para no pisarlo al
  // guardar (lo escribe únicamente el servidor, ver survey-roster.ts).
  const [surveyMessage] = useState(initial.surveyMessage);
  const [locked, setLocked] = useState(saved?.locked ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeMembers = members.filter((m) => m.inCore);
  const unassigned = activeMembers.filter((m) => !m.partyId);

  // Refresca los datos "de perfil" de cada miembro (etiqueta, guild
  // elegida, clase, wallet, si sigue en Core) en segundo plano — la
  // sección Miembros Core y la encuesta de Discord los editan de forma
  // independiente y en vivo, así que este board los necesita frescos sin
  // que el admin tenga que recargar la página. `partyId` es lo único que
  // se conserva tal cual está localmente: es el borrador de este board
  // (no se persiste hasta "Guardar"), y no debería pisarse solo.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getCoreGuildMembersSnapshot();
        const freshById = new Map(fresh.map((m) => [m.discordId, m]));
        setMembers((prev) => {
          const merged = prev.map((m) => {
            const server = freshById.get(m.discordId);
            if (!server) return m;
            return { ...server, partyId: m.partyId };
          });
          const knownIds = new Set(prev.map((m) => m.discordId));
          fresh.forEach((m) => {
            if (!knownIds.has(m.discordId)) merged.push({ ...m, partyId: null });
          });
          return merged;
        });
      } catch {
        // Si falla un tick, se reintenta solo en el siguiente — no hace
        // falta mostrar error por un refresco en segundo plano.
      }
    }, MEMBER_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const setTeamRole = useCallback((partyId: string, roleId: string) => {
    setTeamRoles((prev) => ({ ...prev, [partyId]: roleId }));
  }, []);

  const assignToParty = useCallback((discordId: string, partyId: string | null) => {
    setMembers((prev) => prev.map((m) => (m.discordId === discordId ? { ...m, partyId } : m)));
  }, []);

  const addParty = useCallback((name?: string) => {
    setParties((prev) => [
      ...prev,
      {
        id: `core_party_manual_${prev.length + 1}_${Date.now().toString(36)}`,
        name: name?.trim() || `Grupo ${prev.length + 1}`,
        capacity: 0,
        locked: false,
      },
    ]);
  }, []);

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
  // miembros. organizeCoreGroups solo corre sobre el resto (sin asignar +
  // miembros de parties todavía no bloqueadas), agrupando por etiqueta —
  // sin composición por rol, ver organize.ts.
  const organize = useCallback(() => {
    const lockedParties = parties.filter((p) => p.locked);
    const lockedPartyIds = new Set(lockedParties.map((p) => p.id));
    const lockedMemberIds = new Set(
      members.filter((m) => m.partyId && lockedPartyIds.has(m.partyId)).map((m) => m.discordId)
    );
    const poolMembers = members.filter((m) => !lockedMemberIds.has(m.discordId));

    const result = organizeCoreGroups(poolMembers);
    const newParties = [...lockedParties, ...result.parties];
    const validIds = new Set(newParties.map((p) => p.id));

    setParties(newParties);
    setMembers((prev) =>
      prev.map((m) =>
        lockedMemberIds.has(m.discordId) ? m : { ...m, partyId: result.assignments[m.discordId] ?? null }
      )
    );
    setGuilds((prev) => prev.map((g) => ({ ...g, partyIds: g.partyIds.filter((id) => validIds.has(id)) })));
  }, [members, parties]);

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
      await saveCoreGuildBoard({ members, parties, guilds, teamRoles, surveyMessage });
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
    guilds,
    teamRoles,
    setTeamRole,
    locked,
    saving,
    error,
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
