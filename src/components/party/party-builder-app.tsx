"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { EventType } from "@/types/party";
import { EventSelector } from "@/components/party/event-selector";
import { GuildLeague } from "@/components/party/guild-league";
import { EmperiumOverrun } from "@/components/party/emperium-overrun";

const EVENT_LABEL: Record<NonNullable<EventType>, string> = {
  guild: "Guild League",
  emperium: "Emperium Overrun",
};

export function PartyBuilderApp({ canManageParty }: { canManageParty: boolean }) {
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
        {event === "guild" && <GuildLeague canManageParty={canManageParty} />}
        {event === "emperium" && <EmperiumOverrun canManageParty={canManageParty} />}
      </main>
    </div>
  );
}
