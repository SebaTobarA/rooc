import type { Item, ItemSet } from "@prisma/client";
import { EquipSlot, ItemRarity, WeaponType } from "@prisma/client";
import { EQUIP_SLOT_LABEL, WEAPON_TYPE_LABEL } from "@/lib/weapon-icons";
import { RARITY_LABEL } from "@/lib/labels";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";
import { ImageUploadField } from "@/components/forms/image-upload-field";

export function ItemForm({
  item,
  sets,
  action,
}: {
  item?: Item;
  sets: ItemSet[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <Field label="Nombre">
        <input
          name="name"
          defaultValue={item?.name}
          required
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Slot / tipo de equipo">
          <select name="slot" defaultValue={item?.slot ?? EquipSlot.WEAPON} className={inputClass}>
            {Object.entries(EQUIP_SLOT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo de arma" hint="Solo aplica si el slot es Arma">
          <select
            name="weaponType"
            defaultValue={item?.weaponType ?? WeaponType.NONE}
            className={inputClass}
          >
            {Object.entries(WEAPON_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nivel requerido">
          <input
            type="number"
            name="levelReq"
            min={1}
            defaultValue={item?.levelReq ?? 1}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Rareza">
          <select name="rarity" defaultValue={item?.rarity ?? ItemRarity.COMUN} className={inputClass}>
            {Object.entries(RARITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Stats / bonos" hint="Texto libre, ej: +10 ATK, +5 DES">
        <input name="stats" defaultValue={item?.stats} className={inputClass} />
      </Field>

      <Field
        label="Set de equipamiento"
        hint="Opcional. Habilita la pestaña &quot;Build effect&quot; en la ficha pública con los bonos del set."
      >
        <select name="setId" defaultValue={item?.setId ?? ""} className={inputClass}>
          <option value="">Ninguno</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Descripción">
        <textarea
          name="description"
          defaultValue={item?.description}
          rows={3}
          className={inputClass}
        />
      </Field>

      <Field
        label="Imagen de equipamiento"
        hint="Opcional. Si se deja vacío se usa un ícono placeholder según el tipo de arma/slot."
      >
        <ImageUploadField name="iconUrl" defaultValue={item?.iconUrl ?? ""} />
      </Field>

      <SubmitButton>{item ? "Guardar cambios" : "Crear ítem"}</SubmitButton>
    </form>
  );
}
