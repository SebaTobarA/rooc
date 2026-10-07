import { prisma } from "@/lib/prisma";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { readSnapshot } from "@/lib/party/template-snapshot";
import type { Party, Player } from "@/types/party";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

// Cuántos eventos próximos se muestran como máximo (una semana de guild).
const MAX_EVENTS = 3;

const CAMPO_LABEL = { principal: "Campo principal", secundario: "Campo secundario" } as const;

interface RosterGroup {
  key: string;
  /** null = el evento no separa las parties (sin campos ni raids asignados). */
  label: string | null;
  parties: Party[];
}

/**
 * Agrupa las parties como las arma el Party Builder: por campo en Guild
 * League, por raid en Emperium Overrun. Las que todavía no tienen campo/raid
 * van al final en su propio grupo.
 */
function groupParties(parties: Party[], raidNameById: Map<string, string>): RosterGroup[] {
  const groups = new Map<string, RosterGroup>();
  for (const party of parties) {
    const key = party.raidId ? `raid:${party.raidId}` : party.campo ? `campo:${party.campo}` : "none";
    const label = party.raidId
      ? (raidNameById.get(party.raidId) ?? "Raid")
      : party.campo
        ? CAMPO_LABEL[party.campo]
        : null;
    const group = groups.get(key) ?? { key, label, parties: [] };
    group.parties.push(party);
    groups.set(key, group);
  }

  const list = [...groups.values()];
  const unassigned = list.find((group) => group.key === "none");
  const assigned = list.filter((group) => group.key !== "none");
  if (unassigned && assigned.length > 0) unassigned.label = "Sin asignar";
  return unassigned ? [...assigned, unassigned] : assigned;
}

function PartyColumn({ party, members, discordId }: { party: Party; members: Player[]; discordId: string }) {
  const isMine = members.some((member) => member.id === discordId);
  const slots = Math.max(party.capacity, members.length);

  return (
    // En vertical (teléfono, tablet de pie) solo queda la party del jugador;
    // en horizontal o en PC se ven todas las de su raid.
    <div className={`flex min-w-0 flex-col gap-1.5 ${isMine ? "" : "max-lg:portrait:hidden"}`}>
      <div
        className={`flex items-baseline justify-between gap-2 border-b pb-1 text-xs ${
          isMine ? "border-accent text-accent" : "border-border text-muted"
        }`}
      >
        <span className="truncate font-semibold">{party.name}</span>
        <span className="shrink-0">
          {members.length}/{party.capacity}
        </span>
      </div>
      {Array.from({ length: slots }, (_, index) => {
        const member = members[index];
        if (!member) {
          return <div key={index} className="h-12 rounded-lg border border-dashed border-border" aria-hidden="true" />;
        }
        const isMe = member.id === discordId;
        return (
          <div
            key={member.id}
            className={`flex h-12 flex-col justify-center rounded-lg border px-2 ${
              isMe
                ? "roster-me border-accent bg-accent text-accent-foreground"
                : "border-border bg-background-elevated"
            }`}
          >
            <span className={`truncate text-sm font-semibold ${isMe ? "" : "text-foreground"}`}>
              {member.nickname}
              {isMe && <span className="ml-1 text-[10px] font-bold uppercase">· Tú</span>}
            </span>
            <span className={`truncate text-[11px] ${isMe ? "opacity-80" : "text-muted"}`}>{member.clase}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * "Roster próximos eventos" del inicio del panel: de las parties que se
 * armaron en el Party Builder (/panel/party) para los eventos que vienen,
 * la raid (o el campo, en Guild League) donde va el jugador, con su lugar
 * resaltado. Sale de la plantilla enlazada a cada evento
 * (PartyTemplate.eventId): la que se comunicó a Discord si hay alguna, y si
 * no la última guardada.
 */
export async function UpcomingRosters({ discordId }: { discordId: string }) {
  const events = await prisma.event.findMany({
    where: { endsAt: { gte: new Date() }, partyTemplates: { some: {} } },
    orderBy: { startsAt: "asc" },
    take: MAX_EVENTS,
    include: {
      template: { select: { icon: true } },
      partyTemplates: { orderBy: { updatedAt: "desc" } },
    },
  });

  const rosters = events.flatMap((event) => {
    const template = event.partyTemplates.find((candidate) => candidate.communicatedAt) ?? event.partyTemplates[0];
    const snapshot = template ? readSnapshot(template.data) : null;
    return snapshot ? [{ event, snapshot }] : [];
  });

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold text-foreground">Roster próximos eventos</h2>
      <p className="mt-1 text-sm text-muted">
        La raid en la que vas en los eventos que vienen, según el Party Builder. Tu lugar aparece resaltado.
      </p>

      {rosters.length === 0 && (
        <p className="mt-4 rounded-[10px] border border-dashed border-border p-5 text-center text-sm text-muted">
          Todavía no hay parties armadas para los próximos eventos.
        </p>
      )}

      {rosters.map(({ event, snapshot }) => {
        const membersByParty = new Map<string, Player[]>();
        for (const player of snapshot.players) {
          if (!player.partyId) continue;
          const list = membersByParty.get(player.partyId) ?? [];
          list.push(player);
          membersByParty.set(player.partyId, list);
        }
        const me = snapshot.players.find((player) => player.id === discordId);
        const myParty = me?.partyId ? snapshot.parties.find((party) => party.id === me.partyId) : undefined;
        // Solo la raid (o el campo) donde va el jugador: no necesita ver el
        // resto del evento. Si todavía no lo asignaron, no se muestra ninguna.
        const groups = groupParties(
          snapshot.parties,
          new Map(snapshot.raids.map((raid) => [raid.id, raid.name]))
        ).filter((group) => group.parties.some((party) => party.id === myParty?.id));

        return (
          <div key={event.id} className="mt-5 border-t border-border pt-4 first:mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {event.template.icon ? `${event.template.icon} ` : ""}
                {EVENT_CATEGORY_LABEL[event.category]}
                <span className="ml-2 font-normal capitalize text-muted">{DATE_FORMATTER.format(event.startsAt)}</span>
              </h3>
              <p className={`text-xs font-semibold ${myParty ? "text-accent" : "text-muted"}`}>
                {myParty ? `Vas en ${myParty.name}` : "Todavía no estás en una party de este evento"}
              </p>
            </div>

            {groups.map((group) => (
              <div key={group.key} className="mt-3">
                {group.label && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
                )}
                {/* Sin scroll lateral: las columnas se reparten el ancho y, si
                    no caben, bajan a otra fila. */}
                <div className="grid grid-cols-[repeat(auto-fit,minmax(6.25rem,1fr))] gap-x-2 gap-y-4 p-1.5">
                  {group.parties.map((party) => (
                    <PartyColumn
                      key={party.id}
                      party={party}
                      members={membersByParty.get(party.id) ?? []}
                      discordId={discordId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
