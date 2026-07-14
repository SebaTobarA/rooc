"use client";

import { useState } from "react";
import type { ItemSet, ItemSetTier, ItemSetPieceBonus } from "@prisma/client";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";

type SetWithRelations = ItemSet & { tiers: ItemSetTier[]; pieceBonuses: ItemSetPieceBonus[] };

export function ItemSetForm({
  set,
  action,
}: {
  set?: SetWithRelations;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [tiers, setTiers] = useState(
    set?.tiers.map((t) => ({ refineLevel: String(t.refineLevel), statText: t.statText })) ?? [
      { refineLevel: "", statText: "" },
    ]
  );
  const [pieceBonuses, setPieceBonuses] = useState(
    set?.pieceBonuses.map((p) => ({ pieceCount: String(p.pieceCount), statText: p.statText })) ?? [
      { pieceCount: "", statText: "" },
    ]
  );

  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <Field label="Nombre del set">
        <input name="name" defaultValue={set?.name} required className={inputClass} />
      </Field>

      <Field label="Stat base" hint='Bono solo por equipar una pieza, ej: "Max HP +100"'>
        <input name="baseStatText" defaultValue={set?.baseStatText} className={inputClass} />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Bonos por nivel de refine</p>
        <div className="flex flex-col gap-2">
          {tiers.map((tier, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="number"
                name="tierRefineLevel"
                min={1}
                placeholder="Refine (ej: 3)"
                defaultValue={tier.refineLevel}
                className={`${inputClass} w-32`}
              />
              <input
                type="text"
                name="tierStatText"
                placeholder="Bono (ej: VIT +1)"
                defaultValue={tier.statText}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}
                className="text-xs text-muted hover:text-accent"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTiers([...tiers, { refineLevel: "", statText: "" }])}
          className="mt-2 text-xs text-accent hover:underline"
        >
          + Agregar nivel de refine
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Bonos por cantidad de piezas</p>
        <div className="flex flex-col gap-2">
          {pieceBonuses.map((bonus, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="number"
                name="pieceCount"
                min={2}
                placeholder="Piezas (ej: 3)"
                defaultValue={bonus.pieceCount}
                className={`${inputClass} w-32`}
              />
              <input
                type="text"
                name="pieceStatText"
                placeholder="Bono"
                defaultValue={bonus.statText}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => setPieceBonuses(pieceBonuses.filter((_, idx) => idx !== i))}
                className="text-xs text-muted hover:text-accent"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPieceBonuses([...pieceBonuses, { pieceCount: "", statText: "" }])}
          className="mt-2 text-xs text-accent hover:underline"
        >
          + Agregar bono de piezas
        </button>
      </div>

      <SubmitButton>{set ? "Guardar cambios" : "Crear set"}</SubmitButton>
    </form>
  );
}
