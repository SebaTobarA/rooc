import { prisma } from "@/lib/prisma";
import { DeleteTemplateButton } from "@/components/party/delete-template-button";
import { CommunicateTemplateButton } from "@/components/party/communicate-template-button";

const EVENT_LABEL: Record<string, string> = {
  GUILD_LEAGUE: "Guild League",
  EMPERIUM_OVERRUN: "Emperium Overrun",
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

function countFromSnapshot(data: unknown): { players: number; parties: number } {
  if (data && typeof data === "object" && "players" in data && "parties" in data) {
    const players = (data as { players: unknown[] }).players;
    const parties = (data as { parties: unknown[] }).parties;
    return {
      players: Array.isArray(players) ? players.length : 0,
      parties: Array.isArray(parties) ? parties.length : 0,
    };
  }
  return { players: 0, parties: 0 };
}

/**
 * Historial de composiciones guardadas, más reciente primero. Vive en la
 * pantalla inicial del Party Builder (ver party-builder-app.tsx), debajo de
 * los botones de selección de evento — desde acá también se puede
 * "Comunicar partys" sin tener que volver a entrar al builder.
 */
export async function SavedTemplates({ canManageParty }: { canManageParty: boolean }) {
  const templates = await prisma.partyTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: true, sourceEvent: true },
  });

  if (templates.length === 0) return null;

  return (
    <div className="saved-templates">
      <p className="pool-title">Historial de composiciones</p>
      <div className="saved-templates-list">
        {templates.map((template) => {
          const { players, parties } = countFromSnapshot(template.data);
          const eventTitle = template.sourceEvent?.title ?? template.name;
          return (
            <div key={template.id} className="saved-template-card">
              <div>
                <p className="party-card-name">{eventTitle}</p>
                <p className="chip-class">
                  {EVENT_LABEL[template.event] ?? template.event} · {players} jugador(es) · {parties}{" "}
                  party(s) · por {template.createdBy.globalName ?? template.createdBy.username}
                </p>
                {template.communicatedAt && (
                  <p className="chip-class">Comunicado el {DATE_TIME_FORMATTER.format(template.communicatedAt)}</p>
                )}
              </div>
              {canManageParty && (
                <div className="saved-template-actions">
                  <CommunicateTemplateButton
                    id={template.id}
                    alreadyCommunicated={Boolean(template.communicatedAt)}
                  />
                  <DeleteTemplateButton id={template.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
