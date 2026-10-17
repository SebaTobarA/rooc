import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CalendarDays,
  Check,
  FileText,
  MessageSquareText,
  NotebookPen,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL } from "@/lib/labels";
import { reviewCandidate, saveCandidateSheet } from "@/lib/actions/recruitment";
import { countRequirements, requirementHint } from "@/lib/core-census/requirements";
import { loadSheetRequirements } from "@/lib/core-census/requirements-config";
import { APPLICATION_SCREENSHOTS, CANDIDATE_SCREENSHOTS } from "@/lib/recruitment-screenshots";
import { SheetFields } from "@/components/core-census/sheet-fields";
import { CandidateFlexField } from "@/components/recruitment/candidate-flex-field";
import { CandidateShotField } from "@/components/recruitment/candidate-shot-field";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ficha de candidato",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

const FIELD_CLASS =
  "mt-1 block w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground";

/** Tarjeta con título e ícono, el bloque de la ficha de candidato. */
function Card({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: typeof FileText;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
          <div>
            <h2 className="font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Ficha de candidato: el reclutador completa los datos, los valores del
 * personaje (contra los mínimos de Configuración de requisitos) y las
 * capturas, y quien revisa decide si aprueba o rechaza.
 */
export default async function CandidateSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string; revisada?: string }>;
}) {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageRecruitment) {
    return <p className="text-sm text-muted">Tu rol no tiene habilitada la gestión de reclutamiento.</p>;
  }

  const { id } = await params;
  const { guardado, revisada } = await searchParams;
  const [application, requirements] = await Promise.all([
    prisma.guildApplication.findUnique({ where: { id } }),
    loadSheetRequirements(),
  ]);
  if (!application) notFound();

  const avatar = discordAvatarUrl(application.discordId, application.discordAvatarHash, 96);
  const count = countRequirements(requirements, application);
  const applicantShots = APPLICATION_SCREENSHOTS.map((shot) => ({ ...shot, url: application[shot.field] })).filter(
    (shot) => shot.url
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Revisa la información y las capturas del candidato antes de aprobar o rechazar su ingreso a la guild.
        </p>
        <Link
          href="/admin/recruitment"
          className="flex items-center gap-2 rounded-[10px] border border-accent/50 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>
      </div>

      {(guardado || revisada) && (
        <p className="mb-4 rounded-[10px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {revisada ? "Revisión guardada." : "Ficha guardada."}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ================= COLUMNA PRINCIPAL: la ficha ================= */}
        <form action={saveCandidateSheet.bind(null, application.id)} className="flex min-w-0 flex-col gap-4">
          <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-5">
            {avatar ? (
              <img src={avatar} alt="" className="h-16 w-16 rounded-full border-2 border-accent/40" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent/40 bg-background-elevated text-xl font-semibold text-muted">
                {application.characterName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold text-foreground">{application.characterName}</p>
              <p className="text-xs text-muted">
                @{application.discordUsername}
                {application.gameId ? ` · ID: ${application.gameId}` : ""}
              </p>
              {application.className && (
                <span className="mt-1.5 inline-block rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                  {application.className}
                </span>
              )}
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${APPLICATION_STATUS_COLOR[application.status]}`}
            >
              {APPLICATION_STATUS_LABEL[application.status]}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted">
              <CalendarDays className="h-4 w-4" />
              <span>
                {application.createdByUsername ? "Ficha creada" : "Postulación"}
                <br />
                <span className="text-foreground">{DATE_FORMATTER.format(application.createdAt)}</span>
              </span>
            </div>
          </section>

          <Card icon={FileText} title="Información del candidato">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-muted">
                Nick
                <input
                  type="text"
                  name="characterName"
                  defaultValue={application.characterName}
                  maxLength={60}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="block text-xs text-muted">
                ID in-game
                <input
                  type="text"
                  name="gameId"
                  defaultValue={application.gameId}
                  maxLength={40}
                  placeholder="Ej. 12345678-9"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="block text-xs text-muted">
                Clase actual
                <select name="className" defaultValue={application.className} className={FIELD_CLASS}>
                  <option value="">Sin definir</option>
                  {JOB_ROLE_NAMES.map((job) => (
                    <option key={job} value={job}>
                      {job}
                    </option>
                  ))}
                </select>
              </label>
              <CandidateFlexField
                flexible={application.classFlexible}
                selected={application.flexibleJobs}
                jobs={JOB_ROLE_NAMES}
              />
            </div>
            <label className="mt-4 block text-xs text-muted">
              Comentarios del reclutador
              <textarea
                name="recruiterComments"
                rows={3}
                maxLength={2000}
                defaultValue={application.recruiterComments}
                placeholder="Cómo juega, disponibilidad, experiencia en WoE y eventos…"
                className={FIELD_CLASS}
              />
            </label>
            {(application.availability || application.aboutYou || application.levelText) && (
              <dl className="mt-4 grid gap-3 rounded-[10px] border border-border bg-background-elevated p-3 text-sm sm:grid-cols-3">
                {application.levelText && (
                  <div>
                    <dt className="text-xs text-muted">Nivel (postulación)</dt>
                    <dd className="text-foreground">{application.levelText}</dd>
                  </div>
                )}
                {application.availability && (
                  <div>
                    <dt className="text-xs text-muted">Disponibilidad</dt>
                    <dd className="text-foreground">{application.availability}</dd>
                  </div>
                )}
                {application.aboutYou && (
                  <div className="sm:col-span-3">
                    <dt className="text-xs text-muted">Sobre el postulante</dt>
                    <dd className="text-foreground">{application.aboutYou}</dd>
                  </div>
                )}
              </dl>
            )}
          </Card>

          <Card
            icon={ShieldCheck}
            title="Valores del personaje"
            subtitle={`Comparados con los mínimos de Configuración de requisitos. Cumple ${count.ok} de ${count.required} exigidos.`}
          >
            <SheetFields requirements={requirements} values={application} />
          </Card>

          <Card icon={Camera} title="Pantallazos del personaje" subtitle="Imágenes claras y actualizadas.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {CANDIDATE_SCREENSHOTS.map((shot, index) => (
                <CandidateShotField
                  key={shot.field}
                  name={shot.field}
                  label={shot.label}
                  hint={shot.hint}
                  defaultValue={application[shot.field]}
                  index={index + 1}
                />
              ))}
            </div>
            {applicantShots.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-muted">Capturas que subió el postulante al postular</p>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {applicantShots.map((shot) => (
                    <a
                      key={shot.field}
                      href={shot.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Abrir «${shot.label}»`}
                      className="group flex flex-col gap-1"
                    >
                      <img
                        src={shot.url}
                        alt={shot.label}
                        loading="lazy"
                        className="aspect-square w-full rounded-md border border-border object-cover group-hover:border-accent"
                      />
                      <span className="truncate text-[10px] text-muted">{shot.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card icon={NotebookPen} title="Comentarios adicionales" subtitle="Notas internas del staff; el candidato no las ve.">
            <textarea
              name="internalNotes"
              rows={3}
              maxLength={2000}
              defaultValue={application.internalNotes}
              placeholder="Notas internas del administrador (opcional)."
              className={FIELD_CLASS}
            />
          </Card>

          <div className="flex justify-end">
            <button type="submit" className="btn-brand px-5 py-2 text-sm">
              Guardar ficha
            </button>
          </div>
        </form>

        {/* ================= COLUMNA LATERAL: requisitos y revisión ================= */}
        <div className="flex flex-col gap-4">
          <Card
            icon={Settings}
            title="Requisitos de la configuración"
            action={
              <Link
                href="/admin/requisitos-core"
                className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:border-accent hover:text-accent"
              >
                Ver configuración
              </Link>
            }
          >
            <dl className="grid grid-cols-2 gap-2">
              {requirements.map((requirement) => (
                <div key={requirement.field} className="rounded-[10px] border border-border bg-background-elevated p-2.5">
                  <dt className="text-[11px] text-muted">{requirement.label}</dt>
                  <dd className="text-sm font-semibold text-foreground">{requirementHint(requirement)}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card
            icon={ShieldCheck}
            title="Revisión"
            subtitle="Después de revisar toda la información, decide si apruebas o rechazas la postulación."
          >
            <div className="rounded-[10px] border border-border bg-background-elevated p-3">
              <p className="text-xs text-muted">Estado actual</p>
              <span
                className={`mt-1.5 inline-block rounded-full border px-3 py-1 text-xs font-medium ${APPLICATION_STATUS_COLOR[application.status]}`}
              >
                {APPLICATION_STATUS_LABEL[application.status]}
              </span>
              <p className="mt-1.5 text-xs text-muted">
                {application.reviewedAt
                  ? `Revisada por ${application.reviewedByUsername ?? "—"} el ${DATE_FORMATTER.format(application.reviewedAt)}`
                  : "Sin revisión"}
              </p>
            </div>

            <form className="mt-4">
              <label className="block text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Observaciones (opcional)
                </span>
                <textarea
                  name="reviewNote"
                  rows={3}
                  maxLength={1000}
                  defaultValue={application.reviewNote}
                  placeholder="Puedes agregar comentarios para el postulante…"
                  className={FIELD_CLASS}
                />
              </label>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="text-center">
                  <button
                    type="submit"
                    formAction={reviewCandidate.bind(null, application.id, "REJECTED")}
                    className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-rose-500/60 px-3 py-2 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    <X className="h-4 w-4" />
                    Rechazar
                  </button>
                  <p className="mt-1 text-[11px] text-muted">No cumple con los requisitos.</p>
                </div>
                <div className="text-center">
                  <button
                    type="submit"
                    formAction={reviewCandidate.bind(null, application.id, "APPROVED")}
                    className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-accent/60 px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
                  >
                    <Check className="h-4 w-4" />
                    Aprobar
                  </button>
                  <p className="mt-1 text-[11px] text-muted">Cumple con los requisitos.</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
                <button
                  type="submit"
                  formAction={reviewCandidate.bind(null, application.id, "WAITLISTED")}
                  className="text-muted hover:text-accent"
                >
                  Lista de espera
                </button>
                {application.status !== "PENDING" && (
                  <button
                    type="submit"
                    formAction={reviewCandidate.bind(null, application.id, "PENDING")}
                    className="text-muted hover:text-accent"
                  >
                    Volver a pendiente
                  </button>
                )}
              </div>
            </form>
            <p className="mt-3 text-[11px] text-muted">
              Aprobar desde aquí no asigna el rol de guild en Discord: eso lo hace el botón del aviso en el canal de
              reclutamiento, que pregunta a qué guild entra.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
