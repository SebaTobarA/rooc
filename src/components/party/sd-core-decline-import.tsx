"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import type { Player } from "@/types/party";
import {
  listGuildRolesForImport,
  getSdCoreMembersForEvent,
  type DiscordRoleOption,
  type ImportableDiscordMember,
} from "@/lib/party/discord-import";
import { sdCoreResultToPlayers } from "@/lib/party/sd-core-to-players";

interface SdCoreDeclineImportProps {
  eventId: string;
  /** Devuelve cuántos jugadores nuevos se agregaron de verdad (los ya presentes en el pool se ignoran). */
  onImport: (players: Player[]) => number;
}

/**
 * Para eventos en modo DECLINE: carga a todo [SD] Core, opcionalmente
 * cruzado con roles de subdivisión (SD1, SD2...) elegidos acá, separando
 * quién llega tarde (solo Campo Secundario) y quién avisó que no va
 * (informativo, no se agrega al pool) — ver getSdCoreMembersForEvent.
 */
export function SdCoreDeclineImport({ eventId, onImport }: SdCoreDeclineImportProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState<DiscordRoleOption[] | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notAttending, setNotAttending] = useState<ImportableDiscordMember[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    setNotAttending(null);
    if (roles !== null) return;
    setError("");
    startTransition(async () => {
      try {
        setRoles(await listGuildRolesForImport());
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los roles de Discord.");
      }
    });
  }

  function toggleRole(roleId: string) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  function handleLoad() {
    setError("");
    setMessage("");
    setNotAttending(null);
    startTransition(async () => {
      try {
        const result = await getSdCoreMembersForEvent(eventId, [...selectedRoleIds]);
        const players: Player[] = sdCoreResultToPlayers(result);
        const addedCount = onImport(players);
        const alreadyIn = players.length - addedCount;
        const parts = [addedCount > 0 ? `${addedCount} nuevo(s) cargado(s)` : "Nadie nuevo para cargar"];
        if (alreadyIn > 0) parts.push(`${alreadyIn} ya estaban en el pool`);
        if (result.lateOnly.length > 0) parts.push(`${result.lateOnly.length} llegan tarde (solo Campo Secundario)`);
        setMessage(`${parts.join(" — ")}.`);
        setNotAttending(result.notAttending);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar SD Core.");
      }
    });
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
          Filtrar por subdivisión (SD1, SD2...)
        </button>
        {message && <p className="import-message success">{message}</p>}
        {error && <p className="import-message error">{error}</p>}
      </div>
    );
  }

  const filteredRoles = roles?.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())) ?? [];
  const selectedRoles = roles?.filter((r) => selectedRoleIds.has(r.id)) ?? [];

  return (
    <div className="import-box">
      <p className="import-hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Users size={12} /> &quot;Cargar inscritos del evento&quot; ya trae a todo [SD] Core automáticamente.
        Usa esto solo si querés recargar nada más que una subdivisión puntual (ej. SD1 o SD2). Quien avisó
        que llega tarde solo se puede asignar a Campo Secundario; quien avisó que no va queda aparte, sin
        agregarse al pool.
      </p>

      {selectedRoles.length > 0 && (
        <div className="import-actions" style={{ flexWrap: "wrap", gap: 4 }}>
          {selectedRoles.map((role) => (
            <button
              key={role.id}
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => toggleRole(role.id)}
            >
              {role.name} ✕
            </button>
          ))}
        </div>
      )}

      <input
        autoFocus
        type="text"
        placeholder="Buscar rol de subdivisión..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="gl-event-picker-select"
      />

      <div
        className="import-actions"
        style={{ flexDirection: "column", alignItems: "stretch", gap: 4, maxHeight: 208, overflowY: "auto" }}
      >
        {isPending && roles === null && <p className="campo-hint">Cargando roles…</p>}
        {filteredRoles.map((role) => (
          <button
            key={role.id}
            type="button"
            className={`btn btn-sm ${selectedRoleIds.has(role.id) ? "btn-primary" : "btn-secondary"}`}
            disabled={isPending}
            onClick={() => toggleRole(role.id)}
          >
            {role.name}
          </button>
        ))}
      </div>

      {error && <p className="import-message error">{error}</p>}

      <div className="import-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={isPending} onClick={handleLoad}>
          Cargar SD Core{selectedRoles.length > 0 ? ` (${selectedRoles.length} filtro/s)` : ""}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={isPending}>
          Cerrar
        </button>
      </div>

      {notAttending && notAttending.length > 0 && (
        <div className="campo-hint" style={{ marginTop: 8 }}>
          <strong>No van ({notAttending.length}):</strong> {notAttending.map((m) => m.nickname).join(", ")}
        </div>
      )}
    </div>
  );
}
