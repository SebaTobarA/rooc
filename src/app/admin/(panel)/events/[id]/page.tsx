import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EVENT_CATEGORY_LABEL, EVENT_STATUS_LABEL } from "@/lib/labels";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { sendEvent, deleteEvent } from "@/lib/actions/events";

export const metadata = { title: "Detalle de evento" };
export const dynamic = "force-dynamic";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

const STATUS_LABEL = { CONFIRMED: "Confirmado", LATE: "Llega tarde", NOT_ATTENDING: "No alcanza" } as const;

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { signups: { orderBy: { displayName: "asc" } } },
  });
  if (!event) notFound();

  const guildId = process.env.DISCORD_GUILD_ID;
  const discordUrl =
    event.channelId && event.messageId && guildId
      ? `https://discord.com/channels/${guildId}/${event.channelId}/${event.messageId}`
      : null;

  const byClass = new Map<string, typeof event.signups>();
  for (const signup of event.signups) {
    const list = byClass.get(signup.className) ?? [];
    list.push(signup);
    byClass.set(signup.className, list);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{event.title}</h2>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
          {EVENT_STATUS_LABEL[event.status]}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Categoría</dt>
            <dd className="text-foreground">{EVENT_CATEGORY_LABEL[event.category]}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Fecha y hora</dt>
            <dd className="text-foreground">{DATE_FORMATTER.format(event.startsAt)}</dd>
          </div>
        </dl>
        {event.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{event.description}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {event.status === "DRAFT" ? (
            <>
              <form action={sendEvent.bind(null, event.id)}>
                <button type="submit" className="btn-brand px-4 py-2 text-sm">
                  Enviar a Discord
                </button>
              </form>
              <form action={deleteEvent.bind(null, event.id)}>
                <button type="submit" className="text-sm text-muted hover:text-accent">
                  Eliminar
                </button>
              </form>
            </>
          ) : (
            discordUrl && (
              <a
                href={discordUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-[10px] border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-surface-hover"
              >
                Ver en Discord
              </a>
            )
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Anotados ({event.signups.length})
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {JOB_ROLE_NAMES.map((className) => {
            const list = byClass.get(className) ?? [];
            return (
              <div key={className} className="rounded-xl border border-border bg-surface p-4">
                <p className="font-semibold text-foreground">
                  {className} ({list.length})
                </p>
                {list.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                    {list.map((signup) => (
                      <li key={signup.id}>
                        {signup.displayName}
                        {signup.status !== "CONFIRMED" && (
                          <span className="ml-1 text-xs text-secondary">
                            ({STATUS_LABEL[signup.status]})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">-</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
