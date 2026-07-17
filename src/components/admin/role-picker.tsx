"use client";

import { useState, useTransition } from "react";
import { addVisibleRole } from "@/lib/actions/role-permissions";
import type { DiscordGuildRole } from "@/lib/discord-bot";

export function RolePicker({ roles }: { roles: DiscordGuildRole[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setQuery("");
  }

  function handleAdd(role: DiscordGuildRole) {
    startTransition(async () => {
      await addVisibleRole(role.id, role.name);
    });
  }

  if (roles.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted hover:border-accent/60 hover:text-accent"
      >
        + Agregar rol
      </button>
    );
  }

  return (
    <div className="rounded-md border border-border bg-background-elevated p-3">
      <input
        autoFocus
        type="text"
        placeholder="Buscar rol..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
      />
      <div className="mt-2 max-h-52 overflow-y-auto">
        {roles
          .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
          .map((role) => (
            <button
              key={role.id}
              type="button"
              disabled={isPending}
              onClick={() => handleAdd(role)}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface disabled:opacity-50"
            >
              {role.name}
            </button>
          ))}
      </div>
      <button type="button" onClick={reset} className="mt-2 text-xs text-muted hover:text-foreground">
        Cerrar
      </button>
    </div>
  );
}
