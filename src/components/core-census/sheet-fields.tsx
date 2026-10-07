import {
  requirementHint,
  requirementStatus,
  type RequirementStatus,
  type SheetRequirement,
  type SheetValues,
} from "@/lib/core-census/requirements";
import { REQUIREMENT_STATUS_CLASS } from "./census-badges";

const FIELD_CLASS =
  "mt-1 block w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground";

const STATUS_LABEL: Record<RequirementStatus, string> = {
  ok: "Cumple",
  fail: "No cumple",
  pending: "Sin dato",
  neutral: "No exigido",
};

/**
 * Los campos de la ficha Core (un input por aspecto), compartidos por la
 * revisión que hace el oficial y por la actualización que reporta el propio
 * jugador. `values` precarga el formulario; el estado junto a cada etiqueta
 * es el de esos valores contra los mínimos vigentes.
 */
export function SheetFields({ requirements, values }: { requirements: SheetRequirement[]; values: SheetValues | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {requirements.map((requirement) => {
        const status = requirementStatus(requirement, values);
        return (
          <label key={requirement.field} className="block text-xs text-muted">
            <span className="flex items-baseline justify-between gap-2">
              {requirement.label}
              <span className={REQUIREMENT_STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
            </span>
            {requirement.kind === "number" ? (
              <input
                type="number"
                name={requirement.field}
                min={0}
                defaultValue={values?.[requirement.field] ?? ""}
                className={FIELD_CLASS}
              />
            ) : (
              <select
                name={requirement.field}
                defaultValue={values?.[requirement.field] == null ? "" : values[requirement.field] ? "yes" : "no"}
                className={FIELD_CLASS}
              >
                <option value="">Sin dato</option>
                <option value="yes">{requirement.yes}</option>
                <option value="no">{requirement.no}</option>
              </select>
            )}
            <span className="mt-1 block">{requirementHint(requirement)}</span>
          </label>
        );
      })}
    </div>
  );
}
