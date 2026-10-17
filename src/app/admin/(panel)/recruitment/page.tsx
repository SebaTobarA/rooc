import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL } from "@/lib/labels";
import { countRequirements } from "@/lib/core-census/requirements";
import { loadSheetRequirements } from "@/lib/core-census/requirements-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reclutamiento",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Santiago",
});

/**
 * Listado de candidatos: los que postularon desde /panel/postulacion y los que
 * el staff cargó a mano. Cada uno abre su ficha, donde se completa y se
 * revisa antes de aprobar o rechazar.
 */
export default async function AdminRecruitmentPage() {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);

  if (!permissions.canManageRecruitment) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Sin acceso</h1>
        <p className="mt-2 text-sm text-muted">
          Tu rol no tiene habilitada la gestión de reclutamiento. Si crees que es un error, consulta con un
          administrador del server.
        </p>
      </div>
    );
  }

  const [applications, requirements] = await Promise.all([
    prisma.guildApplication.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    loadSheetRequirements(),
  ]);
  const pendingCount = applications.filter((application) => application.status === "PENDING").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {applications.length} candidato(s) · {pendingCount} pendiente(s) de revisión.
        </p>
        <Link href="/admin/recruitment/nueva" className="btn-brand flex items-center gap-2 px-4 py-2 text-sm">
          <UserPlus className="h-4 w-4" />
          Nueva ficha de candidato
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {applications.map((application) => {
          const avatar = discordAvatarUrl(application.discordId, application.discordAvatarHash, 48);
          const count = countRequirements(requirements, application);
          return (
            <Link
              key={application.id}
              href={`/admin/recruitment/${application.id}`}
              className="group flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-hover"
            >
              {avatar ? (
                <img src={avatar} alt="" className="h-11 w-11 rounded-full border border-accent/30" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/30 bg-background-elevated text-sm font-semibold text-muted">
                  {application.characterName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground group-hover:text-accent">
                  {application.characterName}
                  {application.className && (
                    <span className="ml-2 text-sm font-normal text-muted">{application.className}</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  @{application.discordUsername}
                  {application.gameId ? ` · ID ${application.gameId}` : ""} ·{" "}
                  {application.createdByUsername
                    ? `ficha cargada por ${application.createdByUsername}`
                    : "postuló desde el panel"}{" "}
                  · {DATE_FORMATTER.format(application.createdAt)}
                </p>
              </div>
              <span className="text-xs text-muted" title="Aspectos exigidos que cumple, según Configuración de requisitos">
                Cumple {count.ok}/{count.required}
              </span>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${APPLICATION_STATUS_COLOR[application.status]}`}
              >
                {APPLICATION_STATUS_LABEL[application.status]}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted group-hover:text-accent" />
            </Link>
          );
        })}

        {applications.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            Todavía no hay candidatos. Llegan cuando alguien postula desde el panel, o cárgalos con «Nueva ficha de
            candidato».
          </p>
        )}
      </div>
    </div>
  );
}
