"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import type { CoreGuild, CoreMember, CorePartySlot } from "@/lib/core-guild/types";
import { readDragPayload } from "@/lib/party/drag-payload";
import { usePlayerSelection } from "@/lib/party/selection-context";

interface GuildCardProps {
  guild: CoreGuild;
  parties: CorePartySlot[];
  members: CoreMember[];
  locked: boolean;
  /** Resto de las guilds, para el selector "mover a otra guild" de cada party. */
  otherGuilds: { id: string; name: string }[];
  onDropParty: (partyId: string, guildId: string) => void;
  onUnassignParty: (partyId: string) => void;
  onUpdate: (patch: Partial<Omit<CoreGuild, "id" | "partyIds">>) => void;
  onRemove: () => void;
}

export function GuildCard({
  guild,
  parties,
  members,
  locked,
  otherGuilds,
  onDropParty,
  onUnassignParty,
  onUpdate,
  onRemove,
}: GuildCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { selected, clearSelection } = usePlayerSelection();
  const isPartyArmed = selected?.kind === "party";

  const assignedParties = guild.partyIds
    .map((id) => parties.find((p) => p.id === id))
    .filter((p): p is CorePartySlot => Boolean(p));

  const totalMembers = assignedParties.reduce(
    (sum, party) => sum + members.filter((m) => m.partyId === party.id).length,
    0
  );
  const overCap = totalMembers > guild.cap;

  function handleAssignSelectedParty() {
    if (locked || !selected || selected.kind !== "party") return;
    onDropParty(selected.partyId, guild.id);
    clearSelection();
  }

  return (
    <div
      className={`guild-card${isDragOver ? " guild-card--dragover" : ""}${overCap ? " guild-card--over" : ""}${isPartyArmed ? " guild-card--armed" : ""}`}
      onDragOver={(e) => {
        if (locked) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (locked) return;
        const payload = readDragPayload(e);
        if (payload && payload.kind === "party") {
          onDropParty(payload.partyId, guild.id);
          clearSelection();
        }
      }}
      onClick={handleAssignSelectedParty}
      role="list"
      aria-label={`Guild ${guild.name}. Toca una party seleccionada para asignarla acá.`}
    >
      <div className="guild-card-header" onClick={(e) => e.stopPropagation()}>
        <input
          className="guild-name-input"
          defaultValue={guild.name}
          disabled={locked}
          onBlur={(e) => onUpdate({ name: e.target.value.trim() || guild.name })}
          aria-label="Nombre de la guild"
        />
        {!locked && (
          <button className="chip-remove" onClick={onRemove} aria-label={`Eliminar guild ${guild.name}`}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="guild-card-meta" onClick={(e) => e.stopPropagation()}>
        <label>
          Nivel
          <select
            value={guild.level}
            disabled={locked}
            onChange={(e) => onUpdate({ level: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5].map((lvl) => (
              <option key={lvl} value={lvl}>
                LVL {lvl}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cupo
          <input
            type="number"
            min={1}
            value={guild.cap}
            disabled={locked}
            onChange={(e) => onUpdate({ cap: Number(e.target.value) || 0 })}
          />
        </label>
      </div>

      <p className={`guild-occupancy${overCap ? " guild-occupancy--over" : ""}`}>
        {totalMembers}/{guild.cap} jugadores{overCap ? " — supera el cupo" : ""}
      </p>

      <div className="guild-parties">
        {assignedParties.length === 0 ? (
          <p className="guild-empty">Arrastrá una party acá</p>
        ) : (
          assignedParties.map((party) => {
            const count = members.filter((m) => m.partyId === party.id).length;
            return (
              <div key={party.id} className="guild-party-row">
                <span>{party.name}</span>
                <span className="guild-party-count">
                  {count}/{party.capacity}
                </span>
                {!locked && otherGuilds.length > 0 && (
                  <select
                    className="guild-party-move-select"
                    value=""
                    disabled={locked}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (e.target.value) onDropParty(party.id, e.target.value);
                    }}
                    aria-label={`Mover ${party.name} a otra guild`}
                    title="Mover a otra guild"
                  >
                    <option value="">Mover a…</option>
                    {otherGuilds.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
                {!locked && (
                  <button
                    className="chip-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnassignParty(party.id);
                    }}
                    aria-label={`Quitar ${party.name} de la guild`}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
