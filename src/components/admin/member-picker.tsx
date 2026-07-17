"use client";

import { useState, useTransition } from "react";
import { addMemberToPosition } from "@/lib/actions/leadership";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import type { DiscordGuildMember } from "@/lib/discord-bot";

function memberLabel(member: DiscordGuildMember): string {
  return member.nick ?? member.user.global_name ?? member.user.username;
}

export function MemberPicker({
  positionId,
  members,
}: {
  positionId: string;
  members: DiscordGuildMember[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DiscordGuildMember | null>(null);
  const [nickname, setNickname] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setQuery("");
    setSelected(null);
    setNickname("");
  }

  function handleSelect(member: DiscordGuildMember) {
    setSelected(member);
    setNickname(memberLabel(member));
  }

  function handleAdd() {
    if (!selected) return;
    const formData = new FormData();
    formData.set("discordId", selected.user.id);
    formData.set("discordUsername", selected.user.username);
    formData.set("discordAvatarHash", selected.user.avatar ?? "");
    formData.set("nickname", nickname || selected.user.username);
    startTransition(async () => {
      await addMemberToPosition(positionId, formData);
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
        + Agregar miembro
      </button>
    );
  }

  return (
    <div className="rounded-md border border-border bg-background-elevated p-3">
      {!selected ? (
        <>
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
                    onClick={() => handleSelect(m)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface"
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
          <button
            type="button"
            onClick={reset}
            className="mt-2 text-xs text-muted hover:text-foreground"
          >
            Cancelar
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {discordAvatarUrl(selected.user.id, selected.user.avatar, 40) ? (
              <img
                src={discordAvatarUrl(selected.user.id, selected.user.avatar, 40)!}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs text-muted">
                {memberLabel(selected).slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="text-sm text-muted">@{selected.user.username}</span>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted">
              Apodo a mostrar (puedes cambiarlo si no coincide con el del juego)
            </span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              className="btn-brand px-3 py-1.5 text-xs"
            >
              {isPending ? "Agregando…" : "Agregar"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-muted hover:text-foreground"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
