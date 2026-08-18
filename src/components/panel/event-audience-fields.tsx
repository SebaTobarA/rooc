"use client";

import { useState } from "react";
import type { EventChannelOption } from "@/lib/discord-guild-channels";
import type { SurveyRoleOption } from "@/lib/discord-survey-roles";

/**
 * Las dos preguntas que se contestan justo antes de mandar un evento a
 * Discord: a qué canal se comunica y qué roles pueden responder la encuesta
 * de asistencia (se puede marcar más de uno). Los roles elegidos son el
 * único filtro de quién puede usar los botones del embed — el canal solo
 * define dónde se publica.
 *
 * Es cliente para poder deshabilitar el botón de enviar mientras no haya
 * ningún rol marcado; la misma validación se repite en el servidor (ver
 * sendEvent / createAttendanceWeek).
 */
/**
 * Canales en tramos consecutivos por categoría, respetando el orden que ya
 * trae la lista (el mismo de la barra lateral de Discord) — cada tramo se
 * pinta como un <optgroup>, salvo los sueltos sin categoría.
 */
function groupByCategory(channels: EventChannelOption[]): [string | null, EventChannelOption[]][] {
  const groups: [string | null, EventChannelOption[]][] = [];
  for (const channel of channels) {
    const last = groups[groups.length - 1];
    if (last && last[0] === channel.category) {
      last[1].push(channel);
    } else {
      groups.push([channel.category, [channel]]);
    }
  }
  return groups;
}

export function EventAudienceFields({
  channels,
  roles,
  submitLabel,
  channelLabel = "Canal de Discord",
}: {
  channels: EventChannelOption[];
  roles: SurveyRoleOption[];
  submitLabel: string;
  channelLabel?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">{channelLabel}</span>
        <select
          name="channelId"
          required
          defaultValue=""
          className="rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="" disabled>
            ¿A qué canal comunicarlo?
          </option>
          {groupByCategory(channels).map(([category, group]) =>
            category === null ? (
              group.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.label}
                </option>
              ))
            ) : (
              <optgroup key={category} label={category}>
                {group.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.label}
                  </option>
                ))}
              </optgroup>
            )
          )}
        </select>
      </label>

      <SurveyRolesFieldset roles={roles} submitLabel={submitLabel} />
    </div>
  );
}

/**
 * La pregunta de los roles por separado, para poder reusarla en un evento ya
 * publicado (ahí solo se corrigen los roles: el canal no se cambia porque el
 * mensaje ya está posteado). `initialSelected` precarga lo que el evento
 * tenga guardado.
 */
export function SurveyRolesFieldset({
  roles,
  submitLabel,
  initialSelected = [],
  hint = "Marca todos los que correspondan. Solo quienes tengan alguno de estos roles van a poder usar los botones de asistencia; al resto le aparece un aviso privado.",
}: {
  roles: SurveyRoleOption[];
  submitLabel: string;
  initialSelected?: string[];
  hint?: string;
}) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(initialSelected);

  function toggleRole(roleId: string) {
    setSelectedRoleIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <fieldset className="rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-foreground">
          ¿Qué roles pueden responder la encuesta?
        </legend>
        <p className="mb-3 text-xs text-muted">{hint}</p>

        {roles.length === 0 ? (
          <p className="text-sm text-muted">
            No se pudieron cargar los roles del server — vuelve a intentarlo en unos segundos.
          </p>
        ) : (
          <div className="grid max-h-64 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
            {roles.map((role) => (
              <label
                key={role.id}
                className="flex cursor-pointer items-center gap-2 rounded-[10px] px-2 py-1 text-sm text-foreground hover:bg-surface-hover"
              >
                <input
                  type="checkbox"
                  name="allowedRoleIds"
                  value={role.id}
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span>{role.name}</span>
              </label>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-muted">
          {selectedRoleIds.length === 0
            ? "Elige al menos un rol para poder continuar."
            : `${selectedRoleIds.length} ${selectedRoleIds.length === 1 ? "rol elegido" : "roles elegidos"}.`}
        </p>
      </fieldset>

      <div>
        <button
          type="submit"
          disabled={selectedRoleIds.length === 0}
          className="btn-brand px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
