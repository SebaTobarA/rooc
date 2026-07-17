import Link from "next/link";
import { RotateCw } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getGuildChannels } from "@/lib/discord-bot";
import { EVENT_CATEGORY_LABEL, EVENT_STATUS_LABEL } from "@/lib/labels";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { ChannelSettingsForm } from "@/components/panel/channel-settings-form";
import { EventTemplateForm } from "@/components/panel/event-template-form";
import { DeleteEventTemplateButton } from "@/components/panel/delete-event-template-button";
import { createEventTemplate, updateEventTemplate } from "@/lib/actions/event-templates";
import { resendEvent } from "@/lib/actions/events";

export const dynamic = "force-dynamic";
export const metadata = { title: "Eventos" };

const DATE_FORMATTER = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);

  if (!permissions.canManageParty) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Sin acceso</h1>
        <p className="mt-2 text-sm text-muted">
          Tu rol no tiene habilitada la administración de eventos. Si crees que es un error,
          consulta con un administrador del server.
        </p>
      </div>
    );
  }

  const { template: editingTemplateId } = await searchParams;

  const [eventCount, publishedCount, userCount, signupCount, events, templates, settings, editingTemplate] =
    await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: "PUBLISHED" } }),
      prisma.user.count(),
      prisma.eventSignup.count(),
      prisma.event.findMany({ orderBy: { startsAt: "desc" }, take: 10 }),
      prisma.eventTemplate.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.guildEventSettings.findFirst(),
      editingTemplateId
        ? prisma.eventTemplate.findUnique({ where: { id: editingTemplateId } })
        : Promise.resolve(null),
    ]);

  let channels: Awaited<ReturnType<typeof getGuildChannels>> = [];
  let botError: string | null = null;
  try {
    channels = await getGuildChannels();
  } catch (err) {
    botError = err instanceof Error ? err.message : "Error desconocido";
  }

  const stats = [
    { label: "Eventos creados", value: eventCount },
    { label: "Enviados a Discord", value: publishedCount },
    { label: "Usuarios registrados", value: userCount },
    { label: "Inscripciones totales", value: signupCount },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Eventos</h1>
        <Link href="/panel/eventos/nuevo" className="btn-brand px-4 py-2 text-sm">
          + Nuevo evento
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-4">
            <span className="text-2xl font-bold text-accent">{stat.value}</span>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold text-foreground">Canal de Discord</h2>
        {botError ? (
          <BotErrorNotice message={botError} />
        ) : (
          <ChannelSettingsForm channels={channels} currentChannelId={settings?.defaultChannelId ?? null} />
        )}
      </section>

      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold text-foreground">Templates</h2>

        {templates.length > 0 && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background-elevated p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: template.embedColor }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {template.icon ? `${template.icon} ` : ""}
                      {template.title}
                    </p>
                    <p className="text-xs text-muted">{EVENT_CATEGORY_LABEL[template.category]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/panel/eventos?template=${template.id}`} className="text-xs text-accent hover:underline">
                    Editar
                  </Link>
                  <DeleteEventTemplateButton id={template.id} />
                </div>
              </div>
            ))}
          </div>
        )}

        <EventTemplateForm
          key={editingTemplate?.id ?? "new"}
          template={editingTemplate ?? undefined}
          action={editingTemplate ? updateEventTemplate.bind(null, editingTemplate.id) : createEventTemplate}
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-foreground">Eventos ({eventCount})</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Título</th>
                <th className="px-4 py-2 font-medium">Categoría</th>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-2 text-foreground">
                    <Link href={`/panel/eventos/${event.id}`} className="hover:text-accent hover:underline">
                      {event.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">{EVENT_CATEGORY_LABEL[event.category]}</td>
                  <td className="px-4 py-2 text-muted">{DATE_FORMATTER.format(event.startsAt)}</td>
                  <td className="px-4 py-2 text-muted">{EVENT_STATUS_LABEL[event.status]}</td>
                  <td className="px-4 py-2">
                    {event.status === "PUBLISHED" && (
                      <form action={resendEvent.bind(null, event.id)}>
                        <button
                          type="submit"
                          title="Reenviar a Discord — usar si alguien borró la publicación original"
                          aria-label="Reenviar a Discord"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent hover:bg-accent/20"
                        >
                          <RotateCw size={13} />
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
