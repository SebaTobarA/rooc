import { prisma } from "@/lib/prisma";
import { DeleteTemplateButton } from "@/components/party/delete-template-button";

const EVENT_LABEL: Record<string, string> = {
  GUILD_LEAGUE: "Guild League",
  EMPERIUM_OVERRUN: "Emperium Overrun",
};

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

export async function SavedTemplates({ canManageParty }: { canManageParty: boolean }) {
  const templates = await prisma.partyTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: true },
  });

  if (templates.length === 0) return null;

  return (
    <div className="saved-templates">
      <p className="pool-title">Plantillas guardadas</p>
      <div className="saved-templates-list">
        {templates.map((template) => {
          const { players, parties } = countFromSnapshot(template.data);
          return (
            <div key={template.id} className="saved-template-card">
              <div>
                <p className="party-card-name">{template.name}</p>
                <p className="chip-class">
                  {EVENT_LABEL[template.event] ?? template.event} · {players} jugador(es) ·{" "}
                  {parties} party(s) · por {template.createdBy.globalName ?? template.createdBy.username}
                </p>
              </div>
              {canManageParty && <DeleteTemplateButton id={template.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
