import "./party.css";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PartyBuilderApp } from "@/components/party/party-builder-app";
import { SavedTemplates } from "@/components/party/saved-templates";
import { readSnapshot } from "@/lib/party/template-snapshot";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Party Builder",
};

// Eventos de más de 45 días se vuelven irrelevantes para armar parties
// nuevas — sin este corte, el desplegable acumula años de historial y se
// vuelve imposible de navegar. Vive fuera del componente para no llamar
// Date.now() directo en el render (regla react-hooks/purity).
function relevantEventsSince(): Date {
  return new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
}

export default async function PartyPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);

  if (!permissions.canViewParty) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Sin acceso</h1>
        <p className="mt-2 text-sm text-muted">
          Tu rol no tiene habilitada la sección de Party Builder. Si crees que es un error,
          consulta con un administrador del server.
        </p>
      </div>
    );
  }

  const { edit: editingTemplateId } = await searchParams;

  const RELEVANT_SINCE = relevantEventsSince();
  const RELEVANT_EVENTS_TAKE = 30;

  const [guildLeagueEvents, emperiumEvents, templateToEdit] = await Promise.all([
    prisma.event.findMany({
      where: { category: "GUILD_LEAGUE", status: "PUBLISHED", startsAt: { gte: RELEVANT_SINCE } },
      include: { signups: true },
      orderBy: { startsAt: "desc" },
      take: RELEVANT_EVENTS_TAKE,
    }),
    prisma.event.findMany({
      where: { category: "EMPERIUM_OVERRUN", status: "PUBLISHED", startsAt: { gte: RELEVANT_SINCE } },
      include: { signups: true },
      orderBy: { startsAt: "desc" },
      take: RELEVANT_EVENTS_TAKE,
    }),
    editingTemplateId
      ? prisma.partyTemplate.findUnique({ where: { id: editingTemplateId } })
      : Promise.resolve(null),
  ]);

  const snapshot = templateToEdit ? readSnapshot(templateToEdit.data) : null;
  const editingTemplate =
    templateToEdit && snapshot && permissions.canManageParty
      ? {
          id: templateToEdit.id,
          event: templateToEdit.event as "GUILD_LEAGUE" | "EMPERIUM_OVERRUN",
          name: templateToEdit.name,
          data: snapshot,
        }
      : null;

  return (
    <div className="party-page">
      <PartyBuilderApp
        key={editingTemplate?.id ?? "new"}
        canManageParty={permissions.canManageParty}
        guildLeagueEvents={guildLeagueEvents}
        emperiumEvents={emperiumEvents}
        editingTemplate={editingTemplate}
        history={<SavedTemplates canManageParty={permissions.canManageParty} />}
      />
    </div>
  );
}
