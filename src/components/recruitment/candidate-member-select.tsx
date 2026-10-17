"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export interface CandidateMemberOption {
  id: string;
  label: string;
  username: string;
  avatarUrl: string | null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase();
}

/** Buscador de miembros del server para elegir al candidato de una ficha nueva. */
export function CandidateMemberSelect({ members }: { members: CandidateMemberOption[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CandidateMemberOption | null>(null);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    return members
      .filter((member) => normalize(member.label).includes(q) || normalize(member.username).includes(q))
      .slice(0, 8);
  }, [members, query]);

  return (
    <div>
      <input type="hidden" name="discordId" value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-accent/40 bg-accent/10 px-3 py-2">
          <span className="flex items-center gap-2">
            {selected.avatarUrl ? (
              <img src={selected.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs text-muted">
                {selected.label.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="text-sm text-foreground">
              {selected.label} <span className="text-muted">@{selected.username}</span>
            </span>
          </span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-accent hover:underline">
            Cambiar
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca por apodo o usuario de Discord…"
            className="w-full rounded-[10px] border border-border bg-background-elevated py-2 pl-9 pr-3 text-sm text-foreground"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-[10px] border border-border bg-background-elevated shadow-xl">
              {results.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(member);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
                  >
                    {member.label} <span className="text-xs text-muted">@{member.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
