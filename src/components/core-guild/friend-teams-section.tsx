"use client";

import { useState, type FormEvent } from "react";
import { FolderPlus, Lock, ShieldPlus, Unlock } from "lucide-react";
import { createTeamDiscordRole } from "@/lib/actions/core-guild";
import type { FriendTeam } from "@/lib/core-guild/friend-teams";
import type { CoreGuild, CorePartySlot } from "@/lib/core-guild/types";

interface TeamRoleState {
  status: "idle" | "loading" | "error";
  error?: string;
}

interface FriendTeamsSectionProps {
  teams: FriendTeam[];
  parties: CorePartySlot[];
  guilds: CoreGuild[];
  teamRoles: Record<string, string>;
  locked: boolean;
  onRoleCreated: (teamKey: string, roleId: string) => void;
  onAssignPartyToGuild: (partyId: string, guildId: string | null) => void;
  guildIdForParty: (partyId: string) => string | null;
  onCreateParty: (name: string) => void;
}

export function FriendTeamsSection({
  teams,
  parties,
  guilds,
  teamRoles,
  locked,
  onRoleCreated,
  onAssignPartyToGuild,
  guildIdForParty,
  onCreateParty,
}: FriendTeamsSectionProps) {
  const [roleState, setRoleState] = useState<Record<string, TeamRoleState>>({});
  const [newPartyName, setNewPartyName] = useState("");

  async function handleCreateRole(team: FriendTeam) {
    setRoleState((prev) => ({ ...prev, [team.key]: { status: "loading" } }));
    const result = await createTeamDiscordRole(
      team.name,
      team.members.map((m) => m.discordId)
    );
    if (result.error) {
      setRoleState((prev) => ({ ...prev, [team.key]: { status: "error", error: result.error } }));
      return;
    }
    setRoleState((prev) => ({ ...prev, [team.key]: { status: "idle" } }));
    if (result.roleId) onRoleCreated(team.key, result.roleId);
    if (result.failedIds?.length) {
      setRoleState((prev) => ({
        ...prev,
        [team.key]: {
          status: "error",
          error: `Rol creado, pero no se pudo asignar a ${result.failedIds!.length} miembro(s).`,
        },
      }));
    }
  }

  function handleCreateParty(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newPartyName.trim();
    if (!name) return;
    onCreateParty(name);
    setNewPartyName("");
  }

  return (
    <section className="core-guild-section">
      <h2 className="campo-label">Amigos</h2>
      <p className="core-guild-status">
        Equipos de amigos (misma etiqueta), agrupados aunque estén repartidos en varias parties — para
        ubicarlos juntos en una guild y crearles su rol de Discord una vez que sus parties queden con el
        candado cerrado.
      </p>

      {!locked && (
        <form className="friend-team-new-party" onSubmit={handleCreateParty}>
          <input
            className="core-input"
            placeholder="Nombre de la party nueva…"
            value={newPartyName}
            onChange={(e) => setNewPartyName(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" disabled={!newPartyName.trim()}>
            <FolderPlus size={14} />
            Crear party
          </button>
        </form>
      )}

      {teams.length === 0 ? (
        <p className="core-muted">Ningún miembro tiene una etiqueta de grupo todavía.</p>
      ) : (
        <div className="friend-teams-grid">
          {teams.map((team) => {
            const state = roleState[team.key] ?? { status: "idle" as const };
            const existingRoleId = teamRoles[team.key];
            const canCreateRole = !locked && team.allLocked && !existingRoleId && state.status !== "loading";
            return (
              <div key={team.key} className="friend-team-card">
                <div className="friend-team-header">
                  <span className="friend-team-name">{team.name}</span>
                  <span className="friend-team-count">{team.members.length} persona(s)</span>
                </div>

                <ul className="friend-team-parties">
                  {team.partyIds.map((partyId) => {
                    const party = parties.find((p) => p.id === partyId);
                    if (!party) return null;
                    const count = team.members.filter((m) => m.partyId === partyId).length;
                    const guildId = guildIdForParty(partyId);
                    return (
                      <li key={partyId} className="friend-team-party-row">
                        {party.locked ? <Lock size={12} /> : <Unlock size={12} />}
                        <span className="friend-team-party-name">{party.name}</span>
                        <span className="friend-team-party-count">
                          {count}/{party.capacity}
                        </span>
                        {!locked && (
                          <select
                            className="guild-party-move-select"
                            value={guildId ?? ""}
                            onChange={(e) => onAssignPartyToGuild(partyId, e.target.value || null)}
                            aria-label={`Mover ${party.name} a otra guild`}
                            title="Mover a guild…"
                          >
                            <option value="">Sin guild</option>
                            {guilds.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {team.unassignedCount > 0 && (
                  <p className="friend-team-warning">{team.unassignedCount} sin asignar a una party todavía.</p>
                )}

                <div className="friend-team-footer">
                  {existingRoleId ? (
                    <span className="friend-team-role-badge">
                      <ShieldPlus size={13} /> Rol ya creado
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={!canCreateRole}
                      onClick={() => handleCreateRole(team)}
                      title={
                        team.allLocked
                          ? "Crear el rol en Discord y asignárselo a todo el equipo"
                          : "Todas las parties del equipo deben estar con el candado cerrado primero"
                      }
                    >
                      <ShieldPlus size={13} />
                      {state.status === "loading" ? "Creando rol…" : "Crear rol"}
                    </button>
                  )}
                  {state.status === "error" && <p className="campo-error">{state.error}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
