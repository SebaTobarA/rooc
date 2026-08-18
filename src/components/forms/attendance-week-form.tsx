import type { EventTemplate } from "@prisma/client";
import { Field, inputClass } from "@/components/forms/form-fields";
import { EVENT_CHANNEL_OPTIONS } from "@/lib/discord-guild-channels";
import type { SurveyRoleOption } from "@/lib/discord-survey-roles";
import { EventAudienceFields } from "@/components/panel/event-audience-fields";

export function AttendanceWeekForm({
  guildLeagueTemplates,
  emperiumTemplates,
  surveyRoleOptions,
  action,
}: {
  guildLeagueTemplates: EventTemplate[];
  emperiumTemplates: EventTemplate[];
  surveyRoleOptions: SurveyRoleOption[];
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

      <EventAudienceFields
        channels={EVENT_CHANNEL_OPTIONS}
        roles={surveyRoleOptions}
        submitLabel="Publicar semana"
      />
    </form>
  );
}
