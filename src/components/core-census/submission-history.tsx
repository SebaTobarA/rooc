import type { CoreSheetSubmission, CoreSubmissionStatus } from "@prisma/client";
import { formatRequirementValue, type SheetRequirement } from "@/lib/core-census/requirements";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

export const SUBMISSION_STATUS_LABEL: Record<CoreSubmissionStatus, string> = {
  PENDING: "Pendiente de validación",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
};

const STATUS_CLASS: Record<CoreSubmissionStatus, string> = {
  PENDING: "border-amber-500/40 text-amber-400",
  ACCEPTED: "border-emerald-500/40 text-emerald-400",
  REJECTED: "border-rose-500/40 text-rose-400",
};

export function SubmissionStatusBadge({ status }: { status: CoreSubmissionStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {SUBMISSION_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Historial de las actualizaciones de ficha que reportó el jugador: qué
 * informó cada vez, y si un moderador la aceptó, la rechazó o sigue
 * pendiente. Lo ven el propio jugador y los oficiales en su hoja de vida.
 */
export function SubmissionHistory({
  submissions,
  requirements,
}: {
  submissions: CoreSheetSubmission[];
  requirements: SheetRequirement[];
}) {
  if (submissions.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay actualizaciones reportadas.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {submissions.map((submission) => (
        <li key={submission.id} className="rounded-[10px] border border-border bg-background-elevated p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              Reportada el {DATE_FORMATTER.format(submission.createdAt)}
            </span>
            <SubmissionStatusBadge status={submission.status} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {requirements
              .filter((requirement) => submission[requirement.field] !== null)
              .map((requirement) => `${requirement.label} ${formatRequirementValue(requirement, submission)}`)
              .join(" · ")}
          </p>
          {submission.note && <p className="mt-1 text-sm text-muted">Comentario: {submission.note}</p>}
          {submission.reviewedAt && (
            <p className="mt-1 text-xs text-muted">
              {submission.status === "ACCEPTED" ? "Validada" : "Revisada"} el{" "}
              {DATE_FORMATTER.format(submission.reviewedAt)}
              {submission.reviewedByUsername ? ` por ${submission.reviewedByUsername}` : ""}
              {submission.reviewNote ? ` — ${submission.reviewNote}` : ""}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
