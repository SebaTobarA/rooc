"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import type { Player } from "@/types/party";
import { inferRole } from "@/lib/party/infer-role";
import {
  listGuildRolesForImport,
  getMembersByDiscordRole,
  type DiscordRoleOption,
} from "@/lib/party/discord-import";

interface DiscordRoleImportProps {
  /** Devuelve cuántos de los jugadores pasados se agregaron de verdad (los ya presentes en el pool se ignoran). */
  onImport: (players: Player[]) => number;
}

export function DiscordRoleImport({ onImport }: DiscordRoleImportProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState<DiscordRoleOption[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
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

  function reset() {
    setOpen(false);
    setQuery("");
  }

  function handlePickRole(role: DiscordRoleOption) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const members = await getMembersByDiscordRole(role.id);
        const players: Player[] = members.map((m) => ({
          id: m.discordId,
          nickname: m.nickname,
          clase: m.suggestedClass ?? "",
          rol: inferRole(m.suggestedClass ?? ""),
          partyId: null,
        }));
        const addedCount = onImport(players);
        const alreadyIn = players.length - addedCount;
        const withoutClass = players.filter((p) => !p.clase).length;
        const parts = [
          addedCount > 0 ? `${addedCount} nuevo(s) del rol "${role.name}"` : `Nadie nuevo del rol "${role.name}"`,
        ];
        if (alreadyIn > 0) parts.push(`${alreadyIn} ya estaban en el pool`);
        if (withoutClass > 0) parts.push(`${withoutClass} sin clase asignada en Discord — edítalos en el chip`);
        setMessage(`${parts.join(" — ")}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo importar ese rol.");
      } finally {
        reset();
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
          Importar por rol de Discord (incluye a quienes no respondieron la encuesta)
        </button>
        {message && <p className="import-message success">{message}</p>}
        {error && <p className="import-message error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="import-box">
      <p className="import-hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Users size={12} /> Elegí un rol del server — se importan los miembros que todavía no estén en el
        pool (incluye a quienes no respondieron la encuesta de asistencia), con la clase que ya tengan
        asignada en Discord.
      </p>
      <input
        autoFocus
        type="text"
        placeholder="Buscar rol..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="gl-event-picker-select"
      />
      <div
        className="import-actions"
        style={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: 4,
          maxHeight: 208,
          overflowY: "auto",
        }}
      >
        {isPending && roles === null && <p className="campo-hint">Cargando roles…</p>}
        {roles
          ?.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
          .map((role) => (
            <button
              key={role.id}
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={isPending}
              onClick={() => handlePickRole(role)}
            >
              {role.name}
            </button>
          ))}
      </div>
      {error && <p className="import-message error">{error}</p>}
      <div className="import-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={isPending}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
