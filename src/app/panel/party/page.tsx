import "./party.css";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PartyBuilderApp } from "@/components/party/party-builder-app";
import { SavedTemplates } from "@/components/party/saved-templates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Party Builder",
};

export default async function PartyPage() {
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

  const [guildLeagueEvents, emperiumEvents] = await Promise.all([
    prisma.event.findMany({
      where: { category: "GUILD_LEAGUE", status: "PUBLISHED" },
      include: { signups: true },
      orderBy: { startsAt: "desc" },
    }),
    prisma.event.findMany({
      where: { category: "EMPERIUM_OVERRUN", status: "PUBLISHED" },
      include: { signups: true },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  return (
    <div className="party-page">
      <PartyBuilderApp
        canManageParty={permissions.canManageParty}
        guildLeagueEvents={guildLeagueEvents}
        emperiumEvents={emperiumEvents}
        history={<SavedTemplates canManageParty={permissions.canManageParty} />}
      />
    </div>
  );
}
