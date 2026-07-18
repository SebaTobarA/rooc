"use client";

import { useState } from "react";
import type { SkillWithPrereqs } from "@/lib/skill-tree";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";
import { ImageUploadField } from "@/components/forms/image-upload-field";

export function SkillForm({
  skill,
  action,
}: {
  skill?: SkillWithPrereqs;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [maxLevel, setMaxLevel] = useState(skill?.maxLevel ?? 10);

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <input name="name" defaultValue={skill?.name} required className={inputClass} />
        </Field>
        <Field label="Nivel máximo">
          <input
            type="number"
            name="maxLevel"
            min={1}
            max={20}
            value={maxLevel}
            onChange={(e) => setMaxLevel(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Columna" hint="Posición horizontal en la grilla (0, 1, 2...)">
          <input
            type="number"
            name="col"
            min={0}
            defaultValue={skill?.col ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Fila" hint="Posición vertical en la grilla (0, 1, 2...)">
          <input
            type="number"
            name="row"
            min={0}
            defaultValue={skill?.row ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Ícono" hint="Opcional">
        <ImageUploadField name="iconUrl" defaultValue={skill?.iconUrl ?? ""} />
      </Field>

      <div className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Descripción por nivel</span>
        {Array.from({ length: maxLevel }, (_, i) => (
          <label key={i} className="flex items-center gap-2 text-xs text-muted">
            <span className="w-12 shrink-0">Nivel {i + 1}</span>
            <input
              name={`levelDesc-${i + 1}`}
              defaultValue={skill?.levelDescriptions[i] ?? ""}
              placeholder="Ej: +4% ATK"
              className={`${inputClass} flex-1`}
            />
          </label>
        ))}
      </div>

      <SubmitButton>{skill ? "Guardar cambios" : "Agregar habilidad"}</SubmitButton>
    </form>
  );
}
