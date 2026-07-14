"use client";

import type { ReactNode } from "react";
import { Shield, Heart, Sword, HelpCircle, Plus, X } from "lucide-react";
import type { SlotLabel } from "@/types/party";

const SLOT_CYCLE: SlotLabel[] = ["Tanque", "Soporte", "Daño", "Flexible"];

const SLOT_ICON: Record<SlotLabel, ReactNode> = {
  Tanque: <Shield size={22} />,
  Soporte: <Heart size={22} />,
  Daño: <Sword size={22} />,
  Flexible: <HelpCircle size={22} />,
};

const SLOT_CLASS: Record<SlotLabel, string> = {
  Tanque: "slot-tank",
  Soporte: "slot-support",
  Daño: "slot-dps",
  Flexible: "slot-flex",
};

const PRESETS: { label: string; slots: SlotLabel[] }[] = [
  { label: "Estándar", slots: ["Tanque", "Soporte", "Daño", "Daño", "Daño"] },
  { label: "Doble Tanque", slots: ["Tanque", "Tanque", "Soporte", "Daño", "Daño"] },
  { label: "Doble Soporte", slots: ["Tanque", "Soporte", "Soporte", "Daño", "Daño"] },
  { label: "Full Flex", slots: ["Flexible", "Flexible", "Flexible", "Flexible", "Flexible"] },
];

function slotsKey(slots: SlotLabel[]): string {
  return [...slots].sort().join(",");
}

interface SlotPickerProps {
  title?: string;
  compositions: SlotLabel[][];
  onChange: (compositions: SlotLabel[][]) => void;
  extraFooter?: ReactNode;
}

export function SlotPicker({ title, compositions, onChange, extraFooter }: SlotPickerProps) {
  function cycleSlot(ci: number, si: number) {
    const slots = compositions[ci];
    const current = SLOT_CYCLE.indexOf(slots[si]);
    const next = SLOT_CYCLE[(current + 1) % SLOT_CYCLE.length];
    const updated = [...slots];
    updated[si] = next;
    const newComps = [...compositions];
    newComps[ci] = updated;
    onChange(newComps);
  }

  function applyPreset(ci: number, preset: SlotLabel[]) {
    const newComps = [...compositions];
    newComps[ci] = [...preset];
    onChange(newComps);
  }

  function addComposition() {
    const last = compositions[compositions.length - 1];
    onChange([...compositions, [...last]]);
  }

  function removeComposition(ci: number) {
    if (compositions.length <= 1) return;
    onChange(compositions.filter((_, i) => i !== ci));
  }

  return (
    <div className="slot-picker">
      <p className="slot-picker-title">{title ?? "Composición de la party"}</p>

      {compositions.map((slots, ci) => {
        const currentKey = slotsKey(slots);
        return (
          <div key={ci} className={compositions.length > 1 ? "composition-card" : ""}>
            {compositions.length > 1 && (
              <div className="composition-card-header">
                <span className="composition-card-label">Composición {ci + 1}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm composition-remove-btn"
                  onClick={() => removeComposition(ci)}
                  aria-label={`Eliminar composición ${ci + 1}`}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="composition-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`composition-preset-btn${slotsKey(preset.slots) === currentKey ? " active" : ""}`}
                  onClick={() => applyPreset(ci, preset.slots)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="slot-picker-hint">Toca cada cupo para personalizar el rol</p>
            <div className="slots-row">
              {slots.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  className={`slot-btn ${SLOT_CLASS[label]}`}
                  onClick={() => cycleSlot(ci, i)}
                  aria-label={`Cupo ${i + 1}: ${label}. Toca para cambiar.`}
                >
                  {SLOT_ICON[label]}
                  <span className="slot-label">{label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <button type="button" className="btn btn-ghost btn-sm add-composition-btn" onClick={addComposition}>
        <Plus size={13} />
        Agregar composición
      </button>

      {extraFooter}
    </div>
  );
}
