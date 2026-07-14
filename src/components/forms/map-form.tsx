import type { GameMap } from "@prisma/client";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";

export function MapForm({
  map,
  action,
}: {
  map?: GameMap;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <Field label="Nombre">
        <input name="name" defaultValue={map?.name} required className={inputClass} />
      </Field>

      <Field label="Región / continente">
        <input name="region" defaultValue={map?.region} required className={inputClass} />
      </Field>

      <Field label="Descripción">
        <textarea
          name="description"
          defaultValue={map?.description}
          rows={3}
          className={inputClass}
        />
      </Field>

      <SubmitButton>{map ? "Guardar cambios" : "Crear mapa"}</SubmitButton>
    </form>
  );
}
