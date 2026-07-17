"use client";

import { useState, useTransition } from "react";
import { addAdminGrant } from "@/lib/actions/admin-grants";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import type { DiscordGuildMember } from "@/lib/discord-bot";

function memberLabel(member: DiscordGuildMember): string {
  return member.nick ?? member.user.global_name ?? member.user.username;
}

export function AdminGrantPicker({ members }: { members: DiscordGuildMember[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setQuery("");
  }

  function handleAdd(member: DiscordGuildMember) {
    const formData = new FormData();
    formData.set("discordId", member.user.id);
    formData.set("username", member.user.username);
    formData.set("avatarHash", member.user.avatar ?? "");
    startTransition(async () => {
      await addAdminGrant(formData);
      reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted hover:border-accent/60 hover:text-accent"
      >
        + Otorgar admin
      </button>
    );
  }

  return (
    <div className="rounded-md border border-border bg-background-elevated p-3">
      <input
        autoFocus
        type="text"
        placeholder="Buscar por nombre..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
      />
      <div className="mt-2 max-h-52 overflow-y-auto">
        {members
          .filter((m) => memberLabel(m).toLowerCase().includes(query.toLowerCase()))
          .slice(0, 30)
          .map((m) => {
            const avatar = discordAvatarUrl(m.user.id, m.user.avatar, 32);
            return (
              <button
                key={m.user.id}
                type="button"
                disabled={isPending}
                onClick={() => handleAdd(m)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface disabled:opacity-50"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-xs text-muted">
                    {memberLabel(m).slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="truncate">{memberLabel(m)}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">@{m.user.username}</span>
              </button>
            );
          })}
      </div>
      <button type="button" onClick={reset} className="mt-2 text-xs text-muted hover:text-foreground">
        Cancelar
      </button>
    </div>
  );
}
