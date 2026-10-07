import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadMonthSummaries } from "@/lib/core-census/data";
import { formatRequirementValue, requirementHint, requirementStatus } from "@/lib/core-census/requirements";
import { loadSheetRequirements } from "@/lib/core-census/requirements-config";
import { currentMonthKey, monthLabel } from "@/lib/core-census/tier";
import { REQUIREMENT_STATUS_CLASS, TIER_HINT, TierBadge } from "@/components/core-census/census-badges";
import { SubmissionHistory } from "@/components/core-census/submission-history";

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Santiago",
});

// Cuántas actualizaciones reportadas se listan acá; el historial completo
// está en /panel/ficha.
const HISTORY_PREVIEW = 3;

/**
 * Lo que un miembro [SD] Core ve de su propia evaluación en el inicio del
 * panel: su ficha validada contra los mínimos vigentes, su asistencia del mes
 * y las actualizaciones que reportó. Con "Actualizar" carga datos nuevos, que
 * no cambian la ficha hasta que un moderador los valida.
 */
export async function CoreSheetCard({ discordId }: { discordId: string }) {
  const monthKey = currentMonthKey();
  const [sheet, summaries, requirements, submissions] = await Promise.all([
    prisma.coreCharacterSheet.findUnique({ where: { discordId } }),
    loadMonthSummaries(monthKey),
    loadSheetRequirements(),
    prisma.coreSheetSubmission.findMany({ where: { discordId }, orderBy: { createdAt: "desc" } }),
  ]);
  const summary = summaries.get(discordId) ?? null;
  const hasPending = submissions.some((submission) => submission.status === "PENDING");

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Mi ficha Core</h2>
          <p className="mt-1 text-sm text-muted">
            Datos de tu personaje validados por los moderadores.{" "}
            {sheet?.reviewedAt
              ? `Última validación: ${REVIEW_DATE_FORMATTER.format(sheet.reviewedAt)}.`
              : "Todavía sin validar."}
          </p>
        </div>
        <Link href="/panel/ficha" className="btn-brand shrink-0 px-4 py-2 text-xs">
          Actualizar
        </Link>
      </div>

      {hasPending && (
        <p className="mt-3 rounded-[10px] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          Tienes una actualización pendiente de validación. Tu ficha cambia cuando un moderador la acepta.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {requirements.map((requirement) => {
          const status = requirementStatus(requirement, sheet);
          return (
            <div key={requirement.field} className="rounded-[10px] border border-border bg-background-elevated p-3">
              <dt className="text-xs uppercase tracking-wide text-muted">{requirement.label}</dt>
              <dd className={`mt-1 text-lg font-semibold ${REQUIREMENT_STATUS_CLASS[status]}`}>
                {formatRequirementValue(requirement, sheet)}
              </dd>
              <dd className="text-xs text-muted">{requirementHint(requirement)}</dd>
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

      {submissions.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Mis actualizaciones reportadas</h3>
            {submissions.length > HISTORY_PREVIEW && (
              <Link href="/panel/ficha" className="text-xs text-accent hover:underline">
                Ver las {submissions.length}
              </Link>
            )}
          </div>
          <SubmissionHistory submissions={submissions.slice(0, HISTORY_PREVIEW)} requirements={requirements} />
        </div>
      )}
    </section>
  );
}
