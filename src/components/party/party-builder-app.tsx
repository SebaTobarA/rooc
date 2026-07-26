"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import type { Event, EventSignup } from "@prisma/client";
import type { EventType } from "@/types/party";
import type { PartyTemplateSnapshot } from "@/lib/actions/party-templates";
import { EventSelector } from "@/components/party/event-selector";
import { GuildLeague } from "@/components/party/guild-league";
import { EmperiumOverrun } from "@/components/party/emperium-overrun";
import { PlayerSelectionProvider } from "@/lib/party/selection-context";

const EVENT_LABEL: Record<NonNullable<EventType>, string> = {
  guild: "Guild League",
  emperium: "Emperium Overrun",
};

type EventWithSignups = Event & { signups: EventSignup[] };

export interface EditingTemplate {
  id: string;
  event: "GUILD_LEAGUE" | "EMPERIUM_OVERRUN";
  name: string;
  data: PartyTemplateSnapshot;
}

export function PartyBuilderApp({
  canManageParty,
  guildLeagueEvents,
  emperiumEvents,
  editingTemplate,
  history,
}: {
  canManageParty: boolean;
  guildLeagueEvents: EventWithSignups[];
  emperiumEvents: EventWithSignups[];
  /** Si viene de "Editar" en el historial (ver saved-templates.tsx / page.tsx
   * vía ?edit=<id>), abre el builder directo en el evento de la plantilla
   * con su composición precargada, sin pasar por el EventSelector. */
  editingTemplate: EditingTemplate | null;
  /** Historial de composiciones guardadas (Server Component ya renderizado
   * en page.tsx) — se muestra solo en la pantalla inicial, debajo de los
   * botones de selección de evento. */
  history: ReactNode;
}) {
  const [event, setEvent] = useState<EventType>(
    editingTemplate ? (editingTemplate.event === "GUILD_LEAGUE" ? "guild" : "emperium") : null
  );

  if (!event) {
    return (
      <>
        <EventSelector onSelect={setEvent} />
        {history}
      </>
    );
  }

  return (
    <div>
      <header className="app-header">
        <button className="btn btn-ghost btn-sm" onClick={() => setEvent(null)} aria-label="Cambiar evento">
          <ArrowLeft size={14} />
          Cambiar evento
        </button>
        <span className="app-header-title">{EVENT_LABEL[event]}</span>
      </header>

      <main className="app-main">
        <PlayerSelectionProvider key={event}>
          {event === "guild" && (
            <GuildLeague
              canManageParty={canManageParty}
              events={guildLeagueEvents}
              editingTemplate={editingTemplate?.event === "GUILD_LEAGUE" ? editingTemplate : null}
            />
          )}
          {event === "emperium" && (
            <EmperiumOverrun
              canManageParty={canManageParty}
              events={emperiumEvents}
              editingTemplate={editingTemplate?.event === "EMPERIUM_OVERRUN" ? editingTemplate : null}
            />
          )}
        </PlayerSelectionProvider>
      </main>
    </div>
  );
}
