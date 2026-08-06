import type { EventTemplate } from "@prisma/client";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";
import { EVENT_CHANNEL_OPTIONS } from "@/lib/discord-guild-channels";

export function AttendanceWeekForm({
  guildLeagueTemplates,
  emperiumTemplates,
  action,
}: {
  guildLeagueTemplates: EventTemplate[];
  emperiumTemplates: EventTemplate[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <p className="text-sm text-muted">
        Publica un solo mensaje en Discord con los 3 días fijos de la semana: Martes y Jueves (Guild
        League) + Domingo (War of Emperium). Cada persona marca en qué días no puede jugar — el cierre de
        cada día queda fijo a las 18:00 hora de Chile de ese mismo día.
      </p>

      <Field label="Template — Martes y Jueves (Guild League)">
        <select name="guildLeagueTemplateId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Elige un template
          </option>
          {guildLeagueTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Template — Domingo (War of Emperium)">
        <select name="emperiumTemplateId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Elige un template
          </option>
          {emperiumTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Martes de esa semana" hint="Jueves y Domingo se calculan solos a partir de esta fecha.">
        <input type="date" name="tuesdayDate" required className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Hora de inicio" hint="Hora de Chile, se aplica a los 3 días.">
          <input type="time" name="startTime" required className={inputClass} />
        </Field>
        <Field label="Hora de fin">
          <input type="time" name="endTime" required className={inputClass} />
        </Field>
      </div>

      <Field label="Canal de Discord">
        <select name="channelId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            ¿A qué canal comunicarlo?
          </option>
          {EVENT_CHANNEL_OPTIONS.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.label}
            </option>
          ))}
        </select>
      </Field>

      <SubmitButton>Publicar semana</SubmitButton>
    </form>
  );
}
