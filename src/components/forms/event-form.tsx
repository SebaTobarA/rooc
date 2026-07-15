import type { Event } from "@prisma/client";
import { EventCategory } from "@prisma/client";
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
  action,
}: {
  event?: Event;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <Field label="Título">
        <input name="title" defaultValue={event?.title} required className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoría">
          <select
            name="category"
            defaultValue={event?.category ?? EventCategory.GUILD_LEAGUE}
            className={inputClass}
          >
            {Object.entries(EVENT_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha y hora">
          <input
            type="datetime-local"
            name="startsAt"
            defaultValue={event ? toLocalInputValue(event.startsAt) : undefined}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Descripción" hint="Se muestra tal cual en el mensaje de Discord.">
        <textarea name="description" defaultValue={event?.description} rows={4} className={inputClass} />
      </Field>

      <SubmitButton>{event ? "Guardar cambios" : "Crear evento"}</SubmitButton>
    </form>
  );
}
