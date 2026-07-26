import type { Event, EventTemplate } from "@prisma/client";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";

// Los inputs date/time nativos necesitan "YYYY-MM-DD" y "HH:mm" por
// separado (a diferencia de toISOString(), que da UTC). Se formatean
// SIEMPRE en hora de Argentina, no en la del runtime: estos formularios se
// renderizan en el servidor, y en Vercel ese runtime es UTC, así que usar
// getFullYear()/getHours() mostraba la hora corrida 3 horas respecto de lo
// que después vuelve a parsear eventSchema (que asume -03:00) y de lo que
// muestra el resto de la UI. Se exportan porque
// src/app/panel/eventos/[id]/page.tsx los reusa para el form de cierre de
// inscripciones.
const AR_TIME_ZONE = "America/Argentina/Buenos_Aires";

const AR_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: AR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function argentinaParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of AR_PARTS_FORMATTER.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

export function toLocalDateValue(date: Date): string {
  const p = argentinaParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}
export function toLocalTimeValue(date: Date): string {
  const p = argentinaParts(date);
  return `${p.hour}:${p.minute}`;
}

export function EventForm({
  event,
  templates,
  action,
}: {
  event?: Event;
  templates: EventTemplate[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <Field label="Título">
        <input name="title" defaultValue={event?.title} required className={inputClass} />
      </Field>

      <Field label="Template" hint="Define el color, ícono y categoría del embed en Discord.">
        <select name="templateId" defaultValue={event?.templateId} required className={inputClass}>
          <option value="" disabled>
            Elige un template
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title} — {EVENT_CATEGORY_LABEL[template.category]}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha de inicio">
          <input
            type="date"
            name="startsAtDate"
            defaultValue={event ? toLocalDateValue(event.startsAt) : undefined}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Hora de inicio">
          <input
            type="time"
            name="startsAtTime"
            defaultValue={event ? toLocalTimeValue(event.startsAt) : undefined}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha de fin">
          <input
            type="date"
            name="endsAtDate"
            defaultValue={event ? toLocalDateValue(event.endsAt) : undefined}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Hora de fin">
          <input
            type="time"
            name="endsAtTime"
            defaultValue={event ? toLocalTimeValue(event.endsAt) : undefined}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <p className="text-xs text-muted">
        Las inscripciones quedan abiertas hasta la fecha y hora de fin — el mensaje sigue en
        Discord hasta que se borre, así que no hace falta un cierre aparte.
      </p>

      <Field label="Descripción" hint="Se muestra tal cual en el mensaje de Discord.">
        <textarea name="description" defaultValue={event?.description} rows={4} className={inputClass} />
      </Field>

      <SubmitButton>{event ? "Guardar cambios" : "Crear evento"}</SubmitButton>
    </form>
  );
}
