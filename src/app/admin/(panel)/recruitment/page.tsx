import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL } from "@/lib/labels";
import { RecruitmentReviewForm } from "@/components/admin/recruitment-review-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reclutamiento",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function AdminRecruitmentPage() {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);

  if (!permissions.canManageRecruitment) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Sin acceso</h1>
        <p className="mt-2 text-sm text-muted">
          Tu rol no tiene habilitada la gestión de reclutamiento. Si crees que es un error,
          consulta con un administrador del server.
        </p>
      </div>
    );
  }

  const applications = await prisma.guildApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  return (
    <div>
      <p className="text-sm text-muted">
        {applications.length} postulación(es) recibidas · {pendingCount} pendiente(s) de
        revisión. Al aprobar o poner en lista de espera, el postulante ve el resultado en{" "}
        <span className="text-foreground">/panel/postulacion</span>.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {applications.map((application) => {
          const avatar = discordAvatarUrl(application.discordId, application.discordAvatarHash, 48);
          return (
            <div key={application.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {avatar ? (
                    <img src={avatar} alt="" className="h-10 w-10 rounded-full" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background-elevated text-sm text-muted">
                      {application.characterName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {application.characterName}{" "}
                      <span className="font-normal text-muted">— {application.className}</span>
                    </p>
                    <p className="text-xs text-muted">
                      @{application.discordUsername}
                      {application.levelText ? ` · Nivel ${application.levelText}` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${APPLICATION_STATUS_COLOR[application.status]}`}
                >
                  {APPLICATION_STATUS_LABEL[application.status]}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Disponibilidad</dt>
                  <dd className="mt-0.5 text-foreground">{application.availability}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Enviada</dt>
                  <dd className="mt-0.5 text-foreground">
                    {DATE_FORMATTER.format(application.createdAt)}
                  </dd>
                </div>
                {application.aboutYou && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted">Sobre el postulante</dt>
                    <dd className="mt-0.5 text-foreground">{application.aboutYou}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-3 border-t border-border pt-3 text-xs text-muted">
                {application.reviewedByUsername ? (
                  <p>
                    Revisado por @{application.reviewedByUsername} el{" "}
                    {application.reviewedAt ? DATE_FORMATTER.format(application.reviewedAt) : "—"}
                    {application.reviewNote ? ` — "${application.reviewNote}"` : ""}
                  </p>
                ) : (
                  <p>Pendiente de revisión</p>
                )}
              </div>

              {application.status === "PENDING" && (
                <RecruitmentReviewForm applicationId={application.id} />
              )}
            </div>
          );
        })}

        {applications.length === 0 && (
          <p className="text-sm text-muted">Todavía no hay postulaciones.</p>
        )}
      </div>
    </div>
  );
}
