"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Event, EventSignup } from "@prisma/client";
import type { EventType } from "@/types/party";
import { EventSelector } from "@/components/party/event-selector";
import { GuildLeague } from "@/components/party/guild-league";
import { EmperiumOverrun } from "@/components/party/emperium-overrun";
import { PlayerSelectionProvider } from "@/lib/party/selection-context";

const EVENT_LABEL: Record<NonNullable<EventType>, string> = {
  guild: "Guild League",
  emperium: "Emperium Overrun",
};

type EventWithSignups = Event & { signups: EventSignup[] };

export function PartyBuilderApp({
  canManageParty,
  guildLeagueEvents,
  emperiumEvents,
}: {
  canManageParty: boolean;
  guildLeagueEvents: EventWithSignups[];
  emperiumEvents: EventWithSignups[];
}) {
  const [event, setEvent] = useState<EventType>(null);

  if (!event) {
    return <EventSelector onSelect={setEvent} />;
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
          {event === "guild" && <GuildLeague canManageParty={canManageParty} events={guildLeagueEvents} />}
          {event === "emperium" && (
            <EmperiumOverrun canManageParty={canManageParty} events={emperiumEvents} />
          )}
        </PlayerSelectionProvider>
      </main>
    </div>
  );
}
