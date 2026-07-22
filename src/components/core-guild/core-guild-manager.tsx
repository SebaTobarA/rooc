"use client";

import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import {
  Wand2,
  FolderPlus,
  Save,
  Pencil,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Eraser,
  X,
} from "lucide-react";
import type { Player, Party } from "@/types/party";
import { inferRole } from "@/lib/party/infer-role";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { readDragPayload } from "@/lib/party/drag-payload";
import { PlayerSelectionProvider, usePlayerSelection } from "@/lib/party/selection-context";
import { useCoreGuildBoard, type SavedCoreGuildBoard } from "@/lib/core-guild/use-core-guild-board";
import type { CoreGuildRosterEntry } from "@/lib/core-guild/sync";
import type { CorePartySlot, CoreMember, WalletType } from "@/lib/core-guild/types";
import { PartyCard } from "@/components/party/party-card";
import { SlotPicker } from "@/components/party/slot-picker";
import { StatsBar } from "@/components/party/stats-bar";
import { CoreMemberChip } from "@/components/core-guild/core-member-chip";
import { GuildCard } from "@/components/core-guild/guild-card";

const WALLET_OPTIONS: { value: WalletType; label: string }[] = [
  { value: "F2P", label: "F2P" },
  { value: "MS", label: "MS" },
  { value: "BALLENA", label: "Ballena" },
];

// Cuántos miembros se muestran por hoja en la tabla — únicas opciones
// permitidas, empezando en 5.
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50] as const;

// Insensible a mayúsculas/acentos, mismo truco que discord-job-roles.ts.
function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .trim();
}

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
// compartido con el resto del party builder. Se conserva `locked` (propio
// de Core Guild) además.
function toPartyView(party: CorePartySlot): Party & { locked: boolean } {
  return { ...party, campo: null };
}

interface CoreGuildManagerProps {
  roster: CoreGuildRosterEntry[];
  saved: SavedCoreGuildBoard | null;
}

export function CoreGuildManager(props: CoreGuildManagerProps) {
  return (
    <PlayerSelectionProvider>
      <CoreGuildManagerInner {...props} />
    </PlayerSelectionProvider>
  );
}

function CoreGuildManagerInner({ roster, saved }: CoreGuildManagerProps) {
  const board = useCoreGuildBoard(roster, saved);
  const {
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
  } = board;

  const { selected, clearSelection } = usePlayerSelection();
  const [organizeMsg, setOrganizeMsg] = useState("");
  const [guildForm, setGuildForm] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5);
  const [page, setPage] = useState(1);

  const existingTags = useMemo(
    () => [...new Set(members.filter((m) => m.groupTag.trim()).map((m) => m.groupTag.trim()))],
    [members]
  );

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.inCore !== b.inCore) return a.inCore ? -1 : 1;
        const nameA = a.nick ?? a.globalName ?? a.username;
        const nameB = b.nick ?? b.globalName ?? b.username;
        return nameA.localeCompare(nameB);
      }),
    [members]
  );

  const filteredMembers = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return sortedMembers;
    return sortedMembers.filter((m) => {
      const displayName = m.nick ?? m.globalName ?? m.username;
      return (
        normalizeSearch(displayName).includes(query) ||
        normalizeSearch(m.username).includes(query) ||
        normalizeSearch(m.jobRole).includes(query)
      );
    });
  }, [sortedMembers, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handlePageSizeChange(value: (typeof PAGE_SIZE_OPTIONS)[number]) {
    setPageSize(value);
    setPage(1);
  }

  const allPlayers = activeMembers.map(toPlayerView);
  const partyViews = parties.map(toPartyView);
  const completeCount = parties.filter((party) => {
    const partyMembers = activeMembers.filter((m) => m.partyId === party.id);
    return (
      partyMembers.length > 0 &&
      partyMembers.some((m) => inferRole(m.jobRole) === "Tank") &&
      partyMembers.some((m) => inferRole(m.jobRole) === "Support")
    );
  }).length;

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
    setOrganizeMsg("Parties organizadas — los grupos etiquetados quedaron priorizados juntos.");
    setTimeout(() => setOrganizeMsg(""), 5000);
  }

  function handleClearParties() {
    setOrganizeMsg("");
    clearParties();
    setOrganizeMsg("Parties sin bloquear borradas — sus miembros volvieron a \"Sin asignar\".");
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
      <datalist id="core-guild-job-roles">
        {JOB_ROLE_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="core-guild-tags">
        {existingTags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

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

      {/* ---------- Sección 1: miembros ---------- */}
      <section className="core-guild-section">
        <h2 className="campo-label">Miembros Core</h2>

        <div className="core-member-toolbar">
          <div className="core-search">
            <Search size={14} className="core-search-icon" />
            <input
              type="text"
              className="core-input core-search-input"
              placeholder="Buscar por nombre, usuario o clase…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <label className="core-page-size">
            Por hoja
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="core-member-table-wrap">
          <table className="core-member-table">
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Rol de juego</th>
                <th>Solitario</th>
                <th>En grupo</th>
                <th>Etiqueta</th>
                <th>Wallet</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagedMembers.map((member) => {
                const avatar = discordAvatarUrl(member.discordId, member.avatarHash, 32);
                const displayName = member.nick ?? member.globalName ?? member.username;
                return (
                  <tr key={member.discordId} className={member.inCore ? "" : "core-member-row--inactive"}>
                    <td data-label="Miembro">
                      <div className="core-member-identity">
                        {avatar ? (
                          <img src={avatar} alt="" className="core-member-avatar" />
                        ) : (
                          <span className="core-member-avatar core-member-avatar--fallback">
                            {displayName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <div className="core-member-name">{displayName}</div>
                          <div className="core-member-username">@{member.username}</div>
                          {!member.inCore && <div className="core-member-badge">Ya no tiene el rol Core</div>}
                        </div>
                      </div>
                    </td>
                    <td data-label="Rol de juego">
                      <input
                        className="core-input"
                        list="core-guild-job-roles"
                        defaultValue={member.jobRole}
                        disabled={locked}
                        placeholder="Sin clase"
                        onBlur={(e) => updateMember(member.discordId, { jobRole: e.target.value.trim() })}
                      />
                    </td>
                    <td className="core-radio-cell" data-label="Solitario">
                      <input
                        type="radio"
                        name={`group-${member.discordId}`}
                        checked={member.groupMode === "SOLO"}
                        disabled={locked}
                        onChange={() => updateMember(member.discordId, { groupMode: "SOLO", groupTag: "" })}
                        aria-label="Solitario"
                      />
                    </td>
                    <td className="core-radio-cell" data-label="En grupo">
                      <input
                        type="radio"
                        name={`group-${member.discordId}`}
                        checked={member.groupMode === "GROUP"}
                        disabled={locked}
                        onChange={() => updateMember(member.discordId, { groupMode: "GROUP" })}
                        aria-label="En grupo"
                      />
                    </td>
                    <td data-label="Etiqueta">
                      <input
                        key={`tag-${member.discordId}-${member.groupTag}`}
                        className="core-input"
                        list="core-guild-tags"
                        defaultValue={member.groupTag}
                        disabled={locked}
                        placeholder="Sin etiqueta (solitario)"
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          updateMember(member.discordId, {
                            groupTag: value,
                            groupMode: value ? "GROUP" : "SOLO",
                          });
                        }}
                      />
                    </td>
                    <td data-label="Wallet">
                      <div className="core-wallet-toggle">
                        {WALLET_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            disabled={locked}
                            className={`core-wallet-btn${member.walletType === option.value ? " active" : ""}`}
                            onClick={() => updateMember(member.discordId, { walletType: option.value })}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td data-label="">
                      {!locked && !member.inCore && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeMember(member.discordId)}
                        >
                          Quitar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="core-muted">
                    {search.trim()
                      ? "Ningún miembro coincide con la búsqueda."
                      : "Nadie tiene el rol [SD] Core todavía."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredMembers.length > 0 && (
          <div className="core-pagination">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Hoja anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="core-pagination-info">
              Hoja {currentPage} de {totalPages} · {filteredMembers.length} miembro(s)
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Hoja siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </section>

      {/* ---------- Sección 2: organizador de parties ---------- */}
      <section className="core-guild-section">
        <h2 className="campo-label">Organizador de parties</h2>

        <StatsBar players={allPlayers} parties={partyViews} unassignedCount={unassigned.length} completeCount={completeCount} />

        <SlotPicker compositions={compositions} onChange={setCompositions} />

        <div className="campo-actions">
          <button className="btn btn-primary" onClick={handleOrganize} disabled={locked}>
            <Wand2 size={14} />
            Organizar parties
          </button>
          <button className="btn btn-secondary" onClick={addParty} disabled={locked}>
            <FolderPlus size={14} />
            Nueva party
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClearParties}
            disabled={locked || parties.every((p) => p.locked)}
          >
            <Eraser size={14} />
            Limpiar parties
          </button>
        </div>
        {organizeMsg && <p className="suggest-msg">{organizeMsg}</p>}

        <div className="pool-section">
          <div className="pool-header">
            <span className="pool-title">Sin asignar</span>
          </div>
          <div
            className={`player-pool ${selected?.kind === "player" ? "player-pool--armed" : ""}`}
            onDragOver={(e) => !locked && e.preventDefault()}
            onDrop={(e) => handleZoneDrop(e, null)}
            onClick={() => handleZoneClick(null)}
            role="list"
            aria-label="Miembros sin asignar. Toca un miembro seleccionado para moverlo acá."
          >
            {unassigned.map((m) => (
              <CoreMemberChip key={m.discordId} player={toPlayerView(m)} member={m} draggable={!locked} />
            ))}
            {unassigned.length === 0 && <p className="pool-empty">Sin miembros pendientes</p>}
          </div>
        </div>

        {parties.length > 0 && (
          <div className="parties-grid">
            {partyViews.map((party) => {
              const guildId = guildIdForParty(party.id);
              const guildName = guildId ? guilds.find((g) => g.id === guildId)?.name : null;
              const partyLocked = party.locked;
              const editable = !locked && !partyLocked;
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
                    party={party}
                    members={activeMembers.filter((m) => m.partyId === party.id).map(toPlayerView)}
                    onDrop={handleZoneDrop}
                    onClickAssign={() => handleZoneClick(party.id)}
                    onRemovePlayer={(id) => editable && assignToParty(id, null)}
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
                        />
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Sección 3: guilds ---------- */}
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
