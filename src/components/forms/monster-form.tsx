import type { Monster } from "@prisma/client";
import { Element, MonsterRace, MonsterSize } from "@prisma/client";
import { ELEMENT_LABEL, RACE_LABEL, SIZE_LABEL } from "@/lib/labels";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";

export function MonsterForm({
  monster,
  action,
}: {
  monster?: Monster;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <Field label="Nombre">
        <input name="name" defaultValue={monster?.name} required className={inputClass} />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Nivel">
          <input
            type="number"
            name="level"
            min={1}
            defaultValue={monster?.level ?? 1}
            required
            className={inputClass}
          />
        </Field>
        <Field label="HP">
          <input
            type="number"
            name="hp"
            min={0}
            defaultValue={monster?.hp ?? 0}
            required
            className={inputClass}
          />
        </Field>
        <Field label="DEF">
          <input
            type="number"
            name="def"
            min={0}
            defaultValue={monster?.def ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="ATK mínimo">
          <input
            type="number"
            name="atk"
            min={0}
            defaultValue={monster?.atk ?? 0}
            required
            className={inputClass}
          />
        </Field>
        <Field label="ATK máximo" hint="Opcional">
          <input
            type="number"
            name="atkMax"
            min={0}
            defaultValue={monster?.atkMax ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Elemento">
          <select name="element" defaultValue={monster?.element ?? Element.NEUTRO} className={inputClass}>
            {Object.entries(ELEMENT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nivel de elemento">
          <input
            type="number"
            name="elementLevel"
            min={1}
            max={4}
            defaultValue={monster?.elementLevel ?? 1}
            className={inputClass}
          />
        </Field>
        <Field label="Tamaño">
          <select name="size" defaultValue={monster?.size ?? MonsterSize.MEDIANO} className={inputClass}>
            {Object.entries(SIZE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Raza">
        <select name="race" defaultValue={monster?.race ?? MonsterRace.HUMANOIDE} className={inputClass}>
          {Object.entries(RACE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Descripción">
        <textarea
          name="description"
          defaultValue={monster?.description}
          rows={3}
          className={inputClass}
        />
      </Field>

      <Field label="URL de ícono" hint="Opcional. Sin ícono propio se usa un placeholder genérico.">
        <input name="iconUrl" defaultValue={monster?.iconUrl ?? ""} className={inputClass} />
      </Field>

      <SubmitButton>{monster ? "Guardar cambios" : "Crear monstruo"}</SubmitButton>
    </form>
  );
}
