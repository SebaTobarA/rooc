"use client";

import { Campo } from "@/components/party/campo";
import { useCampo } from "@/lib/party/use-campo";

export function EmperiumOverrun({ canManageParty }: { canManageParty: boolean }) {
  const campo = useCampo(undefined, { minPlayers: 20 });

  return (
    <div className="event-layout">
      <Campo
        label="Jugadores del gremio"
        campo={campo}
        showSlotsImmediately
        saveTemplate={{ event: "EMPERIUM_OVERRUN", canManageParty }}
      />
    </div>
  );
}
