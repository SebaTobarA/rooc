import type { Drop, Item, Monster } from "@prisma/client";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";

export function DropForm({
  drop,
  monsters,
  items,
  action,
}: {
  drop?: Drop;
  monsters: Monster[];
  items: Item[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <Field label="Monstruo">
        <select name="monsterId" defaultValue={drop?.monsterId ?? ""} required className={inputClass}>
          <option value="" disabled>
            Elegí un monstruo...
          </option>
          {monsters.map((monster) => (
            <option key={monster.id} value={monster.id}>
              {monster.name} (Lv.{monster.level})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Ítem">
        <select name="itemId" defaultValue={drop?.itemId ?? ""} required className={inputClass}>
          <option value="" disabled>
            Elegí un ítem...
          </option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Probabilidad (%)" hint="Ej: 12.5 para 12.5%">
        <input
          type="number"
          name="rate"
          min={0}
          max={100}
          step="0.01"
          defaultValue={drop?.rate ?? ""}
          required
          className={inputClass}
        />
      </Field>

      <SubmitButton>{drop ? "Guardar cambios" : "Crear drop"}</SubmitButton>
    </form>
  );
}
