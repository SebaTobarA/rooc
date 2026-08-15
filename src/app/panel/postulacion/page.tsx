import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { submitApplication } from "@/lib/actions/recruitment";
import { ApplicationForm } from "@/components/panel/application-form";
import { APPLICATION_SCREENSHOTS } from "@/lib/recruitment-screenshots";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Postulación a la guild",
};

const STATUS_COPY: Record<string, { title: string; text: string }> = {
  PENDING: {
    title: "Postulación enviada",
    text: "Su solicitud ha sido enviada para revisión. Debe esperar una respuesta.",
  },
  APPROVED: {
    title: "¡Postulación aprobada!",
    text: "Tu postulación fue aprobada — un oficial se va a encargar de sumarte a la guild dentro de Discord.",
  },
  WAITLISTED: {
    title: "En lista de espera",
    text: "",
  },
  REJECTED: {
    title: "Postulación no aprobada",
    text: "Gracias por postular a Special Delivery. Por ahora no vamos a avanzar con tu postulación.",
  },
};

export default async function PostulacionPage() {
  const session = await getSession();
  const discordId = session?.discordId;

  const application = discordId
    ? await prisma.guildApplication.findUnique({ where: { discordId } })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span className="eyebrow text-xs font-semibold uppercase tracking-wide text-accent">
        Reclutamiento
      </span>
      <h1 className="heading-gradient mt-1 text-2xl font-bold sm:text-3xl">
        Postulación a Special Delivery
      </h1>
      <p className="mt-2 text-sm text-muted">
        Completa este formulario para solicitar tu ingreso a la guild. Un Guild Leader, Vice
        Guild Leader u Oficial va a revisar tu postulación. Vas a necesitar{" "}
        {APPLICATION_SCREENSHOTS.length} capturas de tu progreso in-game, así que ten el juego
        a mano.
      </p>

      {application ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-bold text-foreground">
            {STATUS_COPY[application.status].title}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {application.status === "WAITLISTED" && application.reviewNote
              ? application.reviewNote
              : STATUS_COPY[application.status].text}
          </p>

          <dl className="mt-6 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Personaje</dt>
              <dd className="mt-0.5 text-foreground">{application.characterName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Clase</dt>
              <dd className="mt-0.5 text-foreground">{application.className}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Enviada</dt>
              <dd className="mt-0.5 text-foreground">
                {application.createdAt.toLocaleDateString("es-419", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </dd>
            </div>
            {application.reviewedByUsername && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Revisada por</dt>
                <dd className="mt-0.5 text-foreground">@{application.reviewedByUsername}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        <ApplicationForm action={submitApplication} jobRoleNames={JOB_ROLE_NAMES} />
      )}
    </div>
  );
}
