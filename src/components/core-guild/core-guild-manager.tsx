"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import {
  Wand2,
  FolderPlus,
  Save,
  Pencil,
  Plus,
  Lock,
  Unlock,
  Eraser,
  X,
  Minimize2,
  Maximize2,
  Megaphone,
  ShieldPlus,
} from "lucide-react";
import type { Player, Party } from "@/types/party";
import { inferRole } from "@/lib/party/infer-role";
import { readDragPayload } from "@/lib/party/drag-payload";
import { PlayerSelectionProvider, usePlayerSelection } from "@/lib/party/selection-context";
import { useCoreGuildBoard, type SavedCoreGuildBoard } from "@/lib/core-guild/use-core-guild-board";
import type { CoreGuildRosterEntry } from "@/lib/core-guild/sync";
import type { CorePartySlot, CoreMember } from "@/lib/core-guild/types";
import { CORE_GUILD_SURVEY_CHANNEL_ID } from "@/lib/discord-guild-channels";
import { createTeamDiscordRole, publishCoreGuildSurvey } from "@/lib/actions/core-guild";
import type { DiscordGuildChannel } from "@/lib/discord-bot";
import { PartyCard } from "@/components/party/party-card";
import { CoreMemberChip, type MoveTarget } from "@/components/core-guild/core-member-chip";
import { GuildCard } from "@/components/core-guild/guild-card";

function toPlayerView(member: CoreMember): Player {
  return {
    id: member.discordId,
    nickname: member.nick ?? member.globalName ?? member.username,
    clase: member.jobRole || "Sin clase",
    rol: inferRole(member.jobRole),
    partyId: member.partyId,
  };
}

// Core Guild no tiene el concepto de Campo Principal/Secundario de Guild
// League — se agrega `campo: null` solo para calzar con el tipo Party
// compartido con el resto del party builder. La capacidad ya no es un cupo
// real (no hay composición por rol acá): se recalcula como members.length
// para que PartyCard siempre la muestre como "completa".
function toPartyView(party: CorePartySlot, memberCount: number): Party & { locked: boolean } {
  return { ...party, campo: null, raidId: null, capacity: Math.max(memberCount, 1) };
}

interface CoreGuildManagerProps {
  roster: CoreGuildRosterEntry[];
  saved: SavedCoreGuildBoard | null;
  channels: DiscordGuildChannel[];
}

export function CoreGuildManager(props: CoreGuildManagerProps) {
  return (
    <PlayerSelectionProvider>
      <CoreGuildManagerInner {...props} />
    </PlayerSelectionProvider>
  );
}

interface RoleState {
  status: "idle" | "loading" | "error";
  error?: string;
}

function CoreGuildManagerInner({ roster, saved, channels }: CoreGuildManagerProps) {
  const board = useCoreGuildBoard(roster, saved);
  const {
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
  } = board;

  const { selected, clearSelection } = usePlayerSelection();
  const [organizeMsg, setOrganizeMsg] = useState("");
  const [guildForm, setGuildForm] = useState(false);
  const [roleState, setRoleState] = useState<Record<string, RoleState>>({});
  const [publishState, setPublishState] = useState<{ status: "idle" | "loading" | "done" | "error"; error?: string }>({
    status: "idle",
  });
  const [surveyChannelId, setSurveyChannelId] = useState(
    channels.some((c) => c.id === CORE_GUILD_SURVEY_CHANNEL_ID) ? CORE_GUILD_SURVEY_CHANNEL_ID : ""
  );
  // Colapsado/expandido es solo una preferencia de vista (no se guarda con
  // el board) — qué parties están achicadas ahora mismo.
  const [collapsedPartyIds, setCollapsedPartyIds] = useState<Set<string>>(new Set());

  // Destinos válidos para el selector "mover a" de cada chip — grupos
  // bloqueados no entran, ni como origen (no se muestra el selector) ni
  // como destino.
  const moveTargets: MoveTarget[] = parties.filter((p) => !p.locked).map((p) => ({ id: p.id, name: p.name }));

  function isPartyLocked(partyId: string | null) {
    return partyId !== null && parties.find((p) => p.id === partyId)?.locked === true;
  }

  function handleZoneDrop(e: DragEvent, partyId: string | null) {
    e.preventDefault();
    if (locked || isPartyLocked(partyId)) return;
    const payload = readDragPayload(e);
    if (!payload || payload.kind !== "player") return;
    assignToParty(payload.id, partyId);
    clearSelection();
  }

  function handleZoneClick(partyId: string | null) {
    if (locked || isPartyLocked(partyId) || !selected || selected.kind !== "player") return;
    assignToParty(selected.id, partyId);
    clearSelection();
  }

  function handleOrganize() {
    setOrganizeMsg("");
    organize();
    setOrganizeMsg("Grupos armados a partir de las etiquetas de Miembros Core.");
    setTimeout(() => setOrganizeMsg(""), 5000);
  }

  async function handlePublishSurvey() {
    setPublishState({ status: "loading" });
    const result = await publishCoreGuildSurvey(surveyChannelId);
    if (result.error) {
      setPublishState({ status: "error", error: result.error });
      return;
    }
    setPublishState({ status: "done" });
    setTimeout(() => setPublishState({ status: "idle" }), 5000);
  }

  async function handleCreateRole(party: CorePartySlot, partyMembers: CoreMember[]) {
    setRoleState((prev) => ({ ...prev, [party.id]: { status: "loading" } }));
    const result = await createTeamDiscordRole(
      party.name,
      partyMembers.map((m) => m.discordId)
    );
    if (result.error) {
      setRoleState((prev) => ({ ...prev, [party.id]: { status: "error", error: result.error } }));
      return;
    }
    setRoleState((prev) => ({ ...prev, [party.id]: { status: "idle" } }));
    if (result.roleId) setTeamRole(party.id, result.roleId);
    if (result.failedIds?.length) {
      setRoleState((prev) => ({
        ...prev,
        [party.id]: { status: "error", error: `Rol creado, pero no se pudo asignar a ${result.failedIds!.length} persona(s).` },
      }));
    }
  }

  function togglePartyCollapsed(partyId: string) {
    setCollapsedPartyIds((prev) => {
      const next = new Set(prev);
      if (next.has(partyId)) next.delete(partyId);
      else next.add(partyId);
      return next;
    });
  }

  function collapseAllParties() {
    setCollapsedPartyIds(new Set(parties.map((p) => p.id)));
  }

  function expandAllParties() {
    setCollapsedPartyIds(new Set());
  }

  function handleClearParties() {
    setOrganizeMsg("");
    clearParties();
    setOrganizeMsg('Grupos sin bloquear borrados — sus miembros volvieron a "Solos".');
    setTimeout(() => setOrganizeMsg(""), 5000);
  }

  function handleCreateGuild(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    const level = Number(new FormData(form).get("level") ?? 1);
    const cap = Number(new FormData(form).get("cap") ?? 0);
    if (!name || !cap) return;
    addGuild(name, level, cap);
    form.reset();
    setGuildForm(false);
  }

  return (
    <div className="party-page campo core-guild-manager">
      <div className="core-guild-header">
        <div>
          <p className="core-guild-status">
            {locked ? "Guardado — solo lectura." : "En edición — nada se guardó todavía."}
            {saved?.updatedByUsername && (
              <span className="core-guild-status-meta">
                {" "}
                Última edición por {saved.updatedByUsername}.
              </span>
            )}
          </p>
          {error && <p className="campo-error">{error}</p>}
        </div>
        <div className="core-guild-header-actions">
          <select
            className="core-input core-guild-survey-channel-select"
            value={surveyChannelId}
            onChange={(e) => setSurveyChannelId(e.target.value)}
            aria-label="Canal donde publicar la encuesta"
          >
            <option value="" disabled>
              ¿En qué canal?
            </option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary"
            onClick={handlePublishSurvey}
            disabled={publishState.status === "loading" || !surveyChannelId}
            title="Publica en Discord la encuesta de organización (guild + grupo de amigos)"
          >
            <Megaphone size={14} />
            {publishState.status === "loading" ? "Publicando…" : "Publicar encuesta"}
          </button>
          {publishState.status === "done" && <span className="core-guild-status-meta">Publicada ✅</span>}
          {publishState.status === "error" && <p className="campo-error">{publishState.error}</p>}
        </div>
        {locked ? (
          <button className="btn btn-secondary" onClick={unlock} disabled={saving}>
            <Pencil size={14} />
            {saving ? "…" : "Editar"}
          </button>
        ) : (
          <button className="btn-brand core-guild-save-btn" onClick={save} disabled={saving}>
            <Save size={14} />
            {saving ? "Guardando…" : "Guardar"}
          </button>
        )}
      </div>

      {/* ---------- Organización de Grupos ---------- */}
      <section className="core-guild-section">
        <h2 className="campo-label">Organización de Grupos</h2>
        <p className="core-guild-status">
          {members.length} miembro(s) · {activeMembers.length - unassigned.length} en grupos · {unassigned.length} solos
        </p>

        <div className="campo-actions">
          <button className="btn btn-primary" onClick={handleOrganize} disabled={locked}>
            <Wand2 size={14} />
            Agrupar por etiqueta
          </button>
          <button className="btn btn-secondary" onClick={() => addParty()} disabled={locked}>
            <FolderPlus size={14} />
            Agregar grupo
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClearParties}
            disabled={locked || parties.every((p) => p.locked)}
          >
            <Eraser size={14} />
            Limpiar grupos
          </button>
          <button className="btn btn-ghost" onClick={collapseAllParties} disabled={parties.length === 0}>
            <Minimize2 size={14} />
            Colapsar todos
          </button>
          <button className="btn btn-ghost" onClick={expandAllParties} disabled={parties.length === 0}>
            <Maximize2 size={14} />
            Expandir todos
          </button>
        </div>
        {organizeMsg && <p className="suggest-msg">{organizeMsg}</p>}

        <div className="pool-section">
          <div className="pool-header">
            <span className="pool-title">Solos</span>
          </div>
          <div
            className={`player-pool ${selected?.kind === "player" ? "player-pool--armed" : ""}`}
            onDragOver={(e) => !locked && e.preventDefault()}
            onDrop={(e) => handleZoneDrop(e, null)}
            onClick={() => handleZoneClick(null)}
            role="list"
            aria-label="Miembros solos. Toca un miembro seleccionado para moverlo acá."
          >
            {unassigned.map((m) => (
              <CoreMemberChip
                key={m.discordId}
                player={toPlayerView(m)}
                member={m}
                draggable={!locked}
                moveTargets={locked ? undefined : moveTargets}
                onMoveToParty={locked ? undefined : assignToParty}
              />
            ))}
            {unassigned.length === 0 && <p className="pool-empty">Sin miembros pendientes</p>}
          </div>
        </div>

        {parties.length > 0 && (
          <div className="parties-grid">
            {parties.map((party) => {
              const partyMembers = activeMembers.filter((m) => m.partyId === party.id);
              const partyView = toPartyView(party, partyMembers.length);
              const guildId = guildIdForParty(party.id);
              const guildName = guildId ? guilds.find((g) => g.id === guildId)?.name : null;
              const partyLocked = party.locked;
              const editable = !locked && !partyLocked;
              const roleStatus = roleState[party.id] ?? { status: "idle" as const };
              const existingRoleId = teamRoles[party.id];
              return (
                <div key={party.id} className={partyLocked ? "core-party-wrapper core-party-wrapper--locked" : "core-party-wrapper"}>
                  <div className="core-party-hint-row">
                    <p className="core-party-guild-hint">{guildName ? `En guild: ${guildName}` : "Sin guild asignada"}</p>
                    <div className="core-party-hint-actions">
                      <button
                        type="button"
                        className={`core-party-lock-btn${partyLocked ? " active" : ""}`}
                        disabled={locked}
                        onClick={() => togglePartyLocked(party.id)}
                        aria-label={partyLocked ? `Desbloquear ${party.name}` : `Marcar ${party.name} como lista`}
                      >
                        {partyLocked ? <Lock size={12} /> : <Unlock size={12} />}
                        {partyLocked ? "Lista" : "Marcar lista"}
                      </button>
                      <button
                        type="button"
                        className="core-party-delete-btn"
                        disabled={locked}
                        onClick={() => removeParty(party.id)}
                        aria-label={`Eliminar ${party.name}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  <PartyCard
                    party={partyView}
                    members={partyMembers.map(toPlayerView)}
                    onDrop={handleZoneDrop}
                    onClickAssign={() => handleZoneClick(party.id)}
                    onRemovePlayer={(id) => editable && assignToParty(id, null)}
                    collapsible
                    hideRoleWarnings
                    expanded={!collapsedPartyIds.has(party.id)}
                    onToggleExpanded={() => togglePartyCollapsed(party.id)}
                    renderName={() => (
                      <input
                        key={`party-name-${party.id}-${party.name}`}
                        className="core-party-name-input"
                        defaultValue={party.name}
                        disabled={locked}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value) updatePartyName(party.id, value);
                        }}
                        aria-label={`Nombre de ${party.name}`}
                      />
                    )}
                    renderMember={(player) => {
                      const member = activeMembers.find((m) => m.discordId === player.id);
                      if (!member) return null;
                      return (
                        <CoreMemberChip
                          player={player}
                          member={member}
                          draggable={editable}
                          onRemove={editable ? (id) => assignToParty(id, null) : undefined}
                          moveTargets={editable ? moveTargets.filter((t) => t.id !== party.id) : undefined}
                          onMoveToParty={editable ? assignToParty : undefined}
                        />
                      );
                    }}
                  />
                  <div className="core-party-role-row">
                    {existingRoleId ? (
                      <span className="friend-team-role-badge">
                        <ShieldPlus size={13} /> Rol ya creado
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={!partyLocked || partyMembers.length === 0 || roleStatus.status === "loading"}
                        onClick={() => handleCreateRole(party, partyMembers)}
                        title={
                          partyLocked
                            ? "Crear el rol en Discord y asignárselo a todo el grupo"
                            : "Marcá el grupo como lista primero"
                        }
                      >
                        <ShieldPlus size={13} />
                        {roleStatus.status === "loading" ? "Creando rol…" : "Crear rol"}
                      </button>
                    )}
                    {roleStatus.status === "error" && <p className="campo-error">{roleStatus.error}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Guilds ---------- */}
      <section className="core-guild-section">
        <h2 className="campo-label">Guilds</h2>

        <div className="guilds-grid">
          {guilds.map((guild) => (
            <GuildCard
              key={guild.id}
              guild={guild}
              parties={parties}
              members={activeMembers}
              locked={locked}
              otherGuilds={guilds.filter((g) => g.id !== guild.id).map((g) => ({ id: g.id, name: g.name }))}
              onDropParty={assignPartyToGuild}
              onUnassignParty={(partyId) => assignPartyToGuild(partyId, null)}
              onUpdate={(patch) => updateGuild(guild.id, patch)}
              onRemove={() => removeGuild(guild.id)}
            />
          ))}
        </div>

        {!locked && (
          <div className="mt-3">
            {guildForm ? (
              <form className="guild-add-form" onSubmit={handleCreateGuild}>
                <input className="core-input" name="name" placeholder="Nombre de la guild" required />
                <select className="core-input" name="level" defaultValue={1}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      LVL {lvl}
                    </option>
                  ))}
                </select>
                <input className="core-input" name="cap" type="number" min={1} placeholder="Cupo (ej. 62)" required />
                <button type="submit" className="btn-brand">
                  Crear
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setGuildForm(false)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <button className="btn btn-secondary" onClick={() => setGuildForm(true)}>
                <Plus size={14} />
                Agregar guild
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
