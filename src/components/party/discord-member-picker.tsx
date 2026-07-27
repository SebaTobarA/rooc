"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import type { Player } from "@/types/party";
import { inferRole } from "@/lib/party/infer-role";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { listAllGuildMembers, type ImportableDiscordMember } from "@/lib/party/discord-import";

interface DiscordMemberPickerProps {
  /** Devuelve cuántos se agregaron de verdad (0 si ya estaba en el pool). */
  onAdd: (players: Player[]) => number;
  /** ids de los jugadores que ya están en el pool, para marcarlos como agregados. */
  alreadyInPool: Set<string>;
}

/**
 * Buscador de TODOS los miembros del server para sumar jugadores de a uno
 * al pool, sin depender de que se hayan inscrito al evento ni de importar
 * un rol entero (ver discord-role-import.tsx para el alta masiva).
 */
export function DiscordMemberPicker({ onAdd, alreadyInPool }: DiscordMemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<ImportableDiscordMember[] | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    if (members !== null) return;
    setError("");
    startTransition(async () => {
      try {
        setMembers(await listAllGuildMembers());
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los miembros del server.");
      }
    });
  }

  function handleAdd(member: ImportableDiscordMember) {
    onAdd([
      {
        id: member.discordId,
        nickname: member.nickname,
        clase: member.suggestedClass ?? "",
        rol: inferRole(member.suggestedClass ?? ""),
        partyId: null,
      },
    ]);
  }

  if (!open) {
    return (
      <div className="import-collapse">
        <button
          type="button"
          className="import-collapse-summary"
          style={{ background: "none", border: "none", padding: 0, display: "block", font: "inherit" }}
          onClick={handleOpen}
        >
          Agregar jugador de Discord (buscar entre todos los del server)
        </button>
        {error && <p className="import-message error">{error}</p>}
      </div>
    );
  }

  const filtered = (members ?? []).filter((m) => {
    const q = query.toLowerCase();
    return m.nickname.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
  });

  return (
    <div className="import-box">
      <p className="import-hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <UserPlus size={12} /> Busca a cualquier miembro del server y agrégalo al pool, esté o no inscrito
        en el evento.
      </p>
      <input
        autoFocus
        type="text"
        placeholder="Buscar por nombre o usuario..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="gl-event-picker-select"
      />

      {isPending && members === null && <p className="campo-hint">Cargando miembros…</p>}

      <div className="member-picker-list">
        {filtered.slice(0, 50).map((member) => {
          const avatar = discordAvatarUrl(member.discordId, member.avatarHash, 32);
          const added = alreadyInPool.has(member.discordId);
          return (
            <button
              key={member.discordId}
              type="button"
              className="member-picker-row"
              disabled={added}
              onClick={() => handleAdd(member)}
            >
              {avatar ? (
                <img src={avatar} alt="" className="member-picker-avatar" />
              ) : (
                <span className="member-picker-avatar member-picker-avatar--fallback">
                  {member.nickname.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="member-picker-name">{member.nickname}</span>
              <span className="member-picker-class">{member.suggestedClass ?? "Sin clase"}</span>
              <span className="member-picker-action">{added ? "Ya está" : "+ Agregar"}</span>
            </button>
          );
        })}
        {members !== null && filtered.length === 0 && (
          <p className="pool-empty">No hay miembros que coincidan con esa búsqueda.</p>
        )}
        {filtered.length > 50 && (
          <p className="campo-hint">
            Mostrando los primeros 50 de {filtered.length} — afiná la búsqueda para ver el resto.
          </p>
        )}
      </div>

      {error && <p className="import-message error">{error}</p>}
      <div className="import-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
