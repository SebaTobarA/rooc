import { prisma } from "@/lib/prisma";
import { loadMonthSummaries } from "@/lib/core-census/data";
import {
  SHEET_REQUIREMENTS,
  formatRequirementValue,
  requirementStatus,
} from "@/lib/core-census/requirements";
import { currentMonthKey, monthLabel } from "@/lib/core-census/tier";
import { REQUIREMENT_STATUS_CLASS, TIER_HINT, TierBadge } from "@/components/core-census/census-badges";

const POWER_FORMATTER = new Intl.NumberFormat("es-CL");

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Santiago",
});

/**
 * Lo que un miembro [SD] Core ve de su propia evaluación en el inicio del panel: la
 * última revisión de equipo contra los mínimos y su asistencia del mes. Solo
 * lectura — la completan los oficiales desde /admin/evaluacion-core.
 */
export async function CoreSheetCard({ discordId }: { discordId: string }) {
  const monthKey = currentMonthKey();
  const [sheet, summaries] = await Promise.all([
    prisma.coreCharacterSheet.findUnique({ where: { discordId } }),
    loadMonthSummaries(monthKey),
  ]);
  const summary = summaries.get(discordId) ?? null;

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-foreground">Mi ficha Core</h2>
        <p className="text-xs text-muted">
          {sheet?.reviewedAt ? `Última revisión: ${REVIEW_DATE_FORMATTER.format(sheet.reviewedAt)}` : "Todavía sin revisar"}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted">
        Resumen de la revisión que hacen los oficiales de tu personaje. Si algo no coincide, avísale a uno para que
        la actualice.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-[10px] border border-border bg-background-elevated p-3">
          <dt className="text-xs uppercase tracking-wide text-muted">Poder</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">
            {sheet?.power != null ? POWER_FORMATTER.format(sheet.power) : "—"}
          </dd>
          <dd className="text-xs text-muted">Sin mínimo</dd>
        </div>
        {SHEET_REQUIREMENTS.map((requirement) => {
          const status = requirementStatus(requirement, sheet);
          return (
            <div key={requirement.field} className="rounded-[10px] border border-border bg-background-elevated p-3">
              <dt className="text-xs uppercase tracking-wide text-muted">{requirement.label}</dt>
              <dd className={`mt-1 text-lg font-semibold ${REQUIREMENT_STATUS_CLASS[status]}`}>
                {formatRequirementValue(requirement, sheet)}
              </dd>
              <dd className="text-xs text-muted">{requirement.hint}</dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm text-muted">
        <TierBadge tier={summary?.tier ?? null} />
        {summary?.tier ? (
          <span>
            Asistencia regular de {monthLabel(monthKey)}: {summary.attended} de {summary.events} evento(s),{" "}
            {summary.faults} falta(s)
            {summary.justified > 0 ? ` y ${summary.justified} justificada(s)` : ""}. {TIER_HINT[summary.tier]}.
          </span>
        ) : (
          <span>Todavía no hay eventos reportados en {monthLabel(monthKey)}.</span>
        )}
      </div>
    </section>
  );
}
