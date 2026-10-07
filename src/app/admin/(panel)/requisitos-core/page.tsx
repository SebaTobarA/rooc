import { prisma } from "@/lib/prisma";
import { saveRequirementSettings } from "@/lib/actions/core-census";
import { loadSheetRequirements } from "@/lib/core-census/requirements-config";
import { SHEET_REQUIREMENTS, requirementHint } from "@/lib/core-census/requirements";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configuración de requisitos",
};

const UPDATED_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

const FIELD_CLASS =
  "mt-1 block w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground";

/**
 * Mínimos de cada aspecto de la ficha Core. Lo que se guarda acá es lo que
 * usan "Mi ficha Core", el listado de Evaluación de CORE y la hoja de vida
 * para marcar cumple / no cumple.
 */
export default async function CoreRequirementSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { guardado } = await searchParams;
  const [requirements, settings] = await Promise.all([
    loadSheetRequirements(),
    prisma.coreRequirementSettings.findFirst(),
  ]);
  const defaultByField = new Map(SHEET_REQUIREMENTS.map((requirement) => [requirement.field, requirement]));

  return (
    <div>
      <p className="max-w-3xl text-sm text-muted">
        Define el mínimo que debe cumplir un miembro [SD] Core en cada aspecto de su ficha. Los cambios se aplican
        al instante a todas las fichas: lo que antes cumplía puede pasar a no cumplir, y al revés. Un mínimo en 0, o
        un aspecto sin marcar como exigido, se sigue anotando pero no se evalúa.
        {settings &&
          ` Última modificación: ${UPDATED_FORMATTER.format(settings.updatedAt)}${settings.updatedByUsername ? ` por ${settings.updatedByUsername}` : ""}.`}
      </p>

      {guardado && (
        <p className="mt-4 rounded-[10px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Requisitos guardados.
        </p>
      )}

      <form action={saveRequirementSettings} className="mt-5 rounded-xl border border-border bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requirements.map((requirement) => {
            const fallback = defaultByField.get(requirement.field);
            return requirement.kind === "number" ? (
              <label key={requirement.field} className="block text-xs text-muted">
                {requirement.label} — mínimo
                <input
                  type="number"
                  name={`min_${requirement.field}`}
                  min={0}
                  defaultValue={requirement.min}
                  className={FIELD_CLASS}
                />
                <span className="mt-1 block">
                  0 = sin mínimo. Por defecto: {fallback ? requirementHint(fallback).toLowerCase() : "—"}.
                </span>
              </label>
            ) : (
              <label
                key={requirement.field}
                className="flex items-start gap-3 rounded-[10px] border border-border bg-background-elevated p-3 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  name={`required_${requirement.field}`}
                  defaultChecked={requirement.required}
                  className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                />
                <span>
                  {requirement.label}: exigir «{requirement.yes}»
                  <span className="block text-xs text-muted">{requirement.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        <button type="submit" className="btn-brand mt-5 px-4 py-2 text-sm">
          Guardar requisitos
        </button>
      </form>
    </div>
  );
}
