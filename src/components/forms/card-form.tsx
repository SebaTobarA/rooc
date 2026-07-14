import type { Card } from "@prisma/client";
import { CardRarity, CardSlot } from "@prisma/client";
import { CARD_SLOT_LABEL, CARD_RARITY_LABEL } from "@/lib/labels";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";
import { ImageUploadField } from "@/components/forms/image-upload-field";

export function CardForm({
  card,
  action,
}: {
  card?: Card;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <Field label="Nombre">
        <input
          name="name"
          defaultValue={card?.name}
          required
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Slot">
          <select name="slot" defaultValue={card?.slot ?? CardSlot.MAIN_HAND} className={inputClass}>
            {Object.entries(CARD_SLOT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Rareza">
          <select name="rarity" defaultValue={card?.rarity ?? CardRarity.VERDE} className={inputClass}>
            {Object.entries(CARD_RARITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Clase / rol" hint="Opcional. Restricción de clase, si aplica.">
        <input name="classRestriction" defaultValue={card?.classRestriction} className={inputClass} />
      </Field>

      <Field label="Estadísticas" hint="Texto libre, ej: FLEE: 5, DEX: 2">
        <input name="stats" defaultValue={card?.stats} className={inputClass} />
      </Field>

      <Field label="Bono de colección" hint="Bono por tener la carta, ej: MATK: 2">
        <input name="collectionBonus" defaultValue={card?.collectionBonus} className={inputClass} />
      </Field>

      <Field label="Efecto / habilidad">
        <textarea
          name="ability"
          defaultValue={card?.ability}
          rows={2}
          className={inputClass}
        />
      </Field>

      <Field label="Descripción">
        <textarea
          name="description"
          defaultValue={card?.description}
          rows={2}
          className={inputClass}
        />
      </Field>

      <Field label="Despertar (Awaken)" hint="Ej: Lv5: FLEE +2; Lv10: FLEE +1; Lv15: FLEE +1">
        <textarea
          name="awaken"
          defaultValue={card?.awaken}
          rows={2}
          className={inputClass}
        />
      </Field>

      <Field label="Refine" hint="Bono adicional por nivel de refine, si aplica">
        <input name="refine" defaultValue={card?.refine} className={inputClass} />
      </Field>

      <Field
        label="Imagen de la carta"
        hint="Opcional. Si se deja vacío se usa un ícono placeholder genérico."
      >
        <ImageUploadField name="iconUrl" defaultValue={card?.iconUrl ?? ""} />
      </Field>

      <SubmitButton>{card ? "Guardar cambios" : "Crear carta"}</SubmitButton>
    </form>
  );
}
