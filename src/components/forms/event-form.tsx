import type { Event, EventTemplate } from "@prisma/client";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";

// El input datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local, sin
// timezone — a diferencia de toISOString() (que da UTC), así que se arma a
// mano con los getters locales del Date.
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
            Elegí un template
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title} — {EVENT_CATEGORY_LABEL[template.category]}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Inicio">
          <input
            type="datetime-local"
            name="startsAt"
            defaultValue={event ? toLocalInputValue(event.startsAt) : undefined}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Fin">
          <input
            type="datetime-local"
            name="endsAt"
            defaultValue={event ? toLocalInputValue(event.endsAt) : undefined}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Cierre de inscripciones"
        hint="Hasta cuándo se aceptan altas/cambios de clase. No puede ser después del inicio."
      >
        <input
          type="datetime-local"
          name="signupsCloseAt"
          defaultValue={event ? toLocalInputValue(event.signupsCloseAt) : undefined}
          required
          className={inputClass}
        />
      </Field>

      <Field label="Descripción" hint="Se muestra tal cual en el mensaje de Discord.">
        <textarea name="description" defaultValue={event?.description} rows={4} className={inputClass} />
      </Field>

      <SubmitButton>{event ? "Guardar cambios" : "Crear evento"}</SubmitButton>
    </form>
  );
}
