import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { submitApplication } from "@/lib/actions/recruitment";

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
        Guild Leader u Oficial va a revisar tu postulación.
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
        <form action={submitApplication} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Nombre de personaje</span>
            <input
              type="text"
              name="characterName"
              required
              placeholder="Ej: PolloGomez"
              className="rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Clase</span>
            <select
              name="className"
              required
              defaultValue=""
              className="rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            >
              <option value="" disabled>
                Elige tu clase
              </option>
              {JOB_ROLE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Nivel actual (opcional)</span>
            <input
              type="text"
              name="levelText"
              placeholder="Ej: 99/70"
              className="rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Disponibilidad horaria</span>
            <input
              type="text"
              name="availability"
              required
              placeholder="Ej: noches entre semana y fines de semana"
              className="rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Cuéntanos un poco de ti (opcional)</span>
            <textarea
              name="aboutYou"
              rows={4}
              placeholder="Experiencia previa en guilds, qué buscas en Special Delivery, etc."
              className="rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <button type="submit" className="btn-brand mt-2 self-start px-5 py-2.5 text-sm">
            Enviar postulación
          </button>
        </form>
      )}
    </div>
  );
}
