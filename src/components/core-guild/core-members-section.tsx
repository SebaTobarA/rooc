"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { GUILD_CHOICE_LABELS, GUILD_CHOICE_OPTIONS } from "@/lib/core-guild/guild-choice";
import type { CoreMember, WalletType } from "@/lib/core-guild/types";
import {
  getCoreGuildMembersSnapshot,
  removeCoreMember,
  updateCoreMemberField,
  type CoreMemberEditablePatch,
} from "@/lib/actions/core-guild-members";

const WALLET_OPTIONS: { value: WalletType; label: string }[] = [
  { value: "F2P", label: "F2P" },
  { value: "MS", label: "MS" },
  { value: "BALLENA", label: "Ballena" },
];

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50] as const;
// Cada cuánto se refresca la tabla en segundo plano para reflejar
// respuestas nuevas de la encuesta u otro admin editando en simultáneo.
const POLL_MS = 6000;

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .trim();
}

interface CoreMembersSectionProps {
  initialMembers: CoreMember[];
}

export function CoreMembersSection({ initialMembers }: CoreMembersSectionProps) {
  const [members, setMembers] = useState<CoreMember[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5);
  const [page, setPage] = useState(1);

  // Nadie más está editando esta sección de forma "borrador" — cada cambio
  // ya se guardó solo, así que el único motivo por el que members cambia
  // sin que este cliente lo haya pedido es que alguien más (u otro tab, o
  // la encuesta de Discord) lo tocó. Refrescar en vivo evita tener que
  // recargar la página para verlo.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getCoreGuildMembersSnapshot();
        setMembers(fresh);
      } catch {
        // Se reintenta solo en el siguiente tick.
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  function patchMember(discordId: string, patch: CoreMemberEditablePatch) {
    setMembers((prev) => prev.map((m) => (m.discordId === discordId ? { ...m, ...patch } : m)));
    void updateCoreMemberField(discordId, patch);
  }

  function handleRemove(discordId: string) {
    setMembers((prev) => prev.filter((m) => m.discordId !== discordId));
    void removeCoreMember(discordId);
  }

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

  return (
    <section className="core-guild-section">
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

      <h2 className="campo-label">Miembros Core</h2>
      <p className="core-guild-status">Se guarda solo, en vivo — no hace falta Editar ni Guardar acá.</p>

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
              <th>Guild</th>
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
                      placeholder="Sin clase"
                      onBlur={(e) => patchMember(member.discordId, { jobRole: e.target.value.trim() })}
                    />
                  </td>
                  <td data-label="Guild">
                    <select
                      className="core-input"
                      value={member.guildChoice ?? ""}
                      onChange={(e) =>
                        patchMember(member.discordId, {
                          guildChoice: e.target.value ? (e.target.value as CoreMember["guildChoice"]) : null,
                        })
                      }
                      aria-label={`Guild elegida por ${displayName}`}
                    >
                      <option value="">Sin responder</option>
                      {GUILD_CHOICE_OPTIONS.map((choice) => (
                        <option key={choice} value={choice}>
                          {GUILD_CHOICE_LABELS[choice]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="core-radio-cell" data-label="Solitario">
                    <input
                      type="radio"
                      name={`group-${member.discordId}`}
                      checked={member.groupMode === "SOLO"}
                      onChange={() => patchMember(member.discordId, { groupMode: "SOLO", groupTag: "" })}
                      aria-label="Solitario"
                    />
                  </td>
                  <td className="core-radio-cell" data-label="En grupo">
                    <input
                      type="radio"
                      name={`group-${member.discordId}`}
                      checked={member.groupMode === "GROUP"}
                      onChange={() => patchMember(member.discordId, { groupMode: "GROUP" })}
                      aria-label="En grupo"
                    />
                  </td>
                  <td data-label="Etiqueta">
                    <input
                      key={`tag-${member.discordId}-${member.groupTag}`}
                      className="core-input"
                      list="core-guild-tags"
                      defaultValue={member.groupTag}
                      placeholder="Sin etiqueta (solitario)"
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        patchMember(member.discordId, { groupTag: value, groupMode: value ? "GROUP" : "SOLO" });
                      }}
                    />
                  </td>
                  <td data-label="Wallet">
                    <div className="core-wallet-toggle">
                      {WALLET_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`core-wallet-btn${member.walletType === option.value ? " active" : ""}`}
                          onClick={() => patchMember(member.discordId, { walletType: option.value })}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td data-label="">
                    {!member.inCore && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(member.discordId)}>
                        Quitar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={8} className="core-muted">
                  {search.trim() ? "Ningún miembro coincide con la búsqueda." : "Nadie tiene el rol [SD] Core todavía."}
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
  );
}
