"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowDownAZ, Plus, Settings, Sparkles, Trash2, Users, X } from "lucide-react";
import { createPartyTemplate, updatePartyTemplate } from "@/lib/actions/party-templates";
import { inferRole, normalizeClass } from "@/lib/party/infer-role";
import type { PartyTemplateSnapshot } from "@/lib/party/template-snapshot";
import { fillPartiesFromPool } from "@/lib/party/use-campo";
import type { CampoSide, Party, Player, Raid, SlotLabel } from "@/types/party";

type EventType = "GUILD_LEAGUE" | "EMPERIUM_OVERRUN";

export interface PlannerMember {
  id: string;
  nickname: string;
  clase: string;
}

export interface PlannerEvent {
  id: string;
  category: EventType;
  /** Fecha ya formateada para el desplegable, ej. "martes 13/10". */
  label: string;
  /** Composición ya guardada para ese evento, si existe. */
  saved: { id: string; data: PartyTemplateSnapshot } | null;
}

interface Board {
  parties: Party[];
  raids: Raid[];
  /** id de party -> discordIds de sus jugadores, en el orden en que se ven. */
  members: Record<string, string[]>;
  eventId: string;
  /** Plantilla de la que salió este tablero: guardar la actualiza en vez de crear otra. */
  template: { id: string; eventId: string } | null;
}

const EVENT_LABEL: Record<EventType, string> = {
  GUILD_LEAGUE: "Guild League",
  EMPERIUM_OVERRUN: "Emperium Overrun",
};
const EVENT_DAYS: Record<EventType, string> = {
  GUILD_LEAGUE: "martes y jueves",
  EMPERIUM_OVERRUN: "domingo",
};
const CAMPO_LABEL: Record<CampoSide, string> = { principal: "Campo Primario", secundario: "Campo Secundario" };
const SLOT_OPTIONS: SlotLabel[] = ["Tanque", "Soporte", "Daño", "Flexible"];
const DEFAULT_COMPOSITION: SlotLabel[] = ["Tanque", "Soporte", "Daño", "Daño", "Daño"];
// Igual que en el juego: una party son 5 jugadores y un raid, hasta 8 parties.
const PARTY_SIZE = 5;
const MAX_PARTIES_PER_RAID = 8;

// Paleta por defecto de cada job; quien arma la puede cambiar con la rueda
// de configuración (se guarda en su navegador, no en el servidor).
const DEFAULT_JOB_COLORS: Record<string, string> = {
  "Lord Knight": "#e5484d",
  Paladín: "#f2c94c",
  Gypsy: "#f06292",
  Clown: "#ff9f43",
  Stalker: "#8e7cc3",
  Champion: "#d08770",
  "High Priest": "#f5f5f5",
  Creator: "#7bd88f",
  Whitesmith: "#b0bec5",
  "Assassin Cross": "#9b59b6",
  Sniper: "#2ecc71",
  Professor: "#5dade2",
  "High Wizard": "#3d7eff",
  Doram: "#6fe0f5",
};
const FALLBACK_COLOR = "#7a8794";
const COLORS_STORAGE_KEY = "sd-party-job-colors";

function emptyBoard(): Board {
  return { parties: [], raids: [], members: {}, eventId: "", template: null };
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function boardFromSnapshot(snapshot: PartyTemplateSnapshot, template: { id: string; eventId: string }): Board {
  // El orden dentro de cada party es el de la lista de jugadores guardada.
  const members: Record<string, string[]> = {};
  for (const player of snapshot.players) {
    if (player.partyId) (members[player.partyId] ??= []).push(player.id);
  }
  return { parties: snapshot.parties, raids: snapshot.raids, members, eventId: template.eventId, template };
}

/** Saca a un jugador de la party en la que esté. */
function withoutPlayer(members: Record<string, string[]>, playerId: string): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(members).map(([partyId, ids]) => [partyId, ids.filter((id) => id !== playerId)])
  );
}

interface PartyPlannerProps {
  canManage: boolean;
  members: PlannerMember[];
  events: PlannerEvent[];
  /** Plantilla abierta con "Editar" desde el historial. */
  editing: { id: string; category: EventType; eventId: string; data: PartyTemplateSnapshot } | null;
}

/**
 * Party Builder: arriba el core de la guild (todos los [SD] Core, con su job),
 * abajo la configuración de equipos del evento elegido. Cada tipo de evento
 * tiene su propio tablero y su propio guardado, que queda enlazado al evento
 * del día elegido (PartyTemplate.eventId): de ahí lo leen el roster del
 * inicio del panel y los reportes post evento.
 */
export function PartyPlanner({ canManage, members, events, editing }: PartyPlannerProps) {
  const router = useRouter();
  const [eventType, setEventType] = useState<EventType | null>(editing?.category ?? null);
  const [campo, setCampo] = useState<CampoSide>("principal");
  const [boards, setBoards] = useState<Record<EventType, Board>>(() => ({
    GUILD_LEAGUE:
      editing?.category === "GUILD_LEAGUE" ? boardFromSnapshot(editing.data, editing) : emptyBoard(),
    EMPERIUM_OVERRUN:
      editing?.category === "EMPERIUM_OVERRUN" ? boardFromSnapshot(editing.data, editing) : emptyBoard(),
  }));
  const [sortBy, setSortBy] = useState<"name" | "job">("job");
  const [colors, setColors] = useState<Record<string, string>>(DEFAULT_JOB_COLORS);
  const [showColors, setShowColors] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compositions, setCompositions] = useState<SlotLabel[][]>([DEFAULT_COMPOSITION]);
  const [suggestRaidId, setSuggestRaidId] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isSaving, startSaving] = useTransition();
  // true mientras la sección de equipos está fuera de pantalla: ahí aparece
  // el resumen flotante para seguir asignando sin bajar.
  const [teamsOffscreen, setTeamsOffscreen] = useState(false);
  const teamsRef = useRef<HTMLElement>(null);

  // La paleta personalizada vive en el navegador de quien arma.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLORS_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage al montar
      if (stored) setColors({ ...DEFAULT_JOB_COLORS, ...(JSON.parse(stored) as Record<string, string>) });
    } catch {
      // Paleta guardada ilegible: se queda la de por defecto.
    }
  }, []);

  useEffect(() => {
    const node = teamsRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setTeamsOffscreen(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function updateColor(job: string, color: string) {
    setColors((prev) => {
      const next = { ...prev, [job]: color };
      window.localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function resetColors() {
    window.localStorage.removeItem(COLORS_STORAGE_KEY);
    setColors(DEFAULT_JOB_COLORS);
  }

  const board = eventType ? boards[eventType] : null;

  // discordId -> party donde va, derivado del tablero.
  const partyOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const [partyId, ids] of Object.entries(board?.members ?? {})) {
      for (const id of ids) map.set(id, partyId);
    }
    return map;
  }, [board]);

  // El core de hoy más quien figure en la composición cargada aunque ya no
  // tenga el rol, para no perderlo al editar.
  const roster = useMemo(() => {
    const byId = new Map(members.map((member) => [member.id, member]));
    for (const event of events) {
      for (const player of event.saved?.data.players ?? []) {
        if (!byId.has(player.id)) byId.set(player.id, { id: player.id, nickname: player.nickname, clase: player.clase });
      }
    }
    for (const player of editing?.data.players ?? []) {
      if (!byId.has(player.id)) byId.set(player.id, { id: player.id, nickname: player.nickname, clase: player.clase });
    }
    return [...byId.values()];
  }, [members, events, editing]);
  const memberById = useMemo(() => new Map(roster.map((member) => [member.id, member])), [roster]);
  const coreIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);

  const sortedPool = useMemo(() => {
    const visible = roster.filter((member) => coreIds.has(member.id) || partyOf.has(member.id));
    return [...visible].sort((a, b) =>
      sortBy === "job"
        ? a.clase.localeCompare(b.clase) || a.nickname.localeCompare(b.nickname)
        : a.nickname.localeCompare(b.nickname)
    );
  }, [roster, coreIds, partyOf, sortBy]);
  const jobs = useMemo(() => [...new Set(roster.map((member) => member.clase))].sort(), [roster]);

  function patchBoard(update: (current: Board) => Board) {
    if (!eventType) return;
    setBoards((prev) => ({ ...prev, [eventType]: update(prev[eventType]) }));
  }

  // Lo que se ve del tablero: en Guild League, solo el campo elegido.
  const scopeCampo: CampoSide | null = eventType === "GUILD_LEAGUE" ? campo : null;
  const scopeRaids = board?.raids.filter((raid) => (raid.campo ?? null) === scopeCampo) ?? [];
  const scopeParties = board?.parties.filter((party) => party.campo === scopeCampo) ?? [];
  const partyById = new Map(board?.parties.map((party) => [party.id, party]) ?? []);
  const membersOf = (partyId: string) =>
    (board?.members[partyId] ?? [])
      .map((playerId) => memberById.get(playerId))
      .filter((member): member is PlannerMember => Boolean(member));
  const partiesInRaid = (raidId: string | null) => scopeParties.filter((party) => (party.raidId ?? null) === raidId);

  function addRaid() {
    patchBoard((current) => ({
      ...current,
      raids: [
        ...current.raids,
        {
          id: newId("raid"),
          name: `Raid ${current.raids.filter((raid) => (raid.campo ?? null) === scopeCampo).length + 1}`,
          compositions: [],
          campo: scopeCampo,
        },
      ],
    }));
  }

  function addParty(raidId: string | null) {
    setMessage(null);
    if (raidId && partiesInRaid(raidId).length >= MAX_PARTIES_PER_RAID) {
      setMessage({ kind: "error", text: `Un raid admite hasta ${MAX_PARTIES_PER_RAID} parties. Agrega otro raid.` });
      return;
    }
    patchBoard((current) => ({
      ...current,
      parties: [
        ...current.parties,
        {
          id: newId("party"),
          name: `Party ${current.parties.filter((party) => party.campo === scopeCampo && (party.raidId ?? null) === raidId).length + 1}`,
          capacity: PARTY_SIZE,
          campo: scopeCampo,
          raidId,
        },
      ],
    }));
  }

  function removeParty(partyId: string) {
    patchBoard((current) => {
      const members = { ...current.members };
      delete members[partyId];
      return { ...current, parties: current.parties.filter((party) => party.id !== partyId), members };
    });
  }

  function removeRaid(raidId: string) {
    patchBoard((current) => {
      const gone = new Set(current.parties.filter((party) => party.raidId === raidId).map((party) => party.id));
      return {
        ...current,
        raids: current.raids.filter((raid) => raid.id !== raidId),
        parties: current.parties.filter((party) => !gone.has(party.id)),
        members: Object.fromEntries(Object.entries(current.members).filter(([partyId]) => !gone.has(partyId))),
      };
    });
  }

  /**
   * Mueve a un jugador: a una party (al final, o antes de `beforeId` para
   * ordenarlo dentro de ella) o, con `partyId` null, de vuelta al pool.
   */
  function placePlayer(playerId: string, partyId: string | null, beforeId?: string) {
    if (!board || playerId === beforeId) return;
    setMessage(null);
    if (partyId) {
      const party = partyById.get(partyId);
      const others = (board.members[partyId] ?? []).filter((id) => id !== playerId).length;
      if (party && others >= party.capacity) {
        setMessage({ kind: "error", text: `${party.name} ya está completa (${party.capacity}/${party.capacity}).` });
        return;
      }
    }
    patchBoard((current) => {
      const members = withoutPlayer(current.members, playerId);
      if (partyId) {
        const list = [...(members[partyId] ?? [])];
        const index = beforeId ? list.indexOf(beforeId) : -1;
        if (index === -1) list.push(playerId);
        else list.splice(index, 0, playerId);
        members[partyId] = list;
      }
      return { ...current, members };
    });
    setSelectedId(null);
  }

  function handleDrop(event: React.DragEvent, partyId: string | null, beforeId?: string) {
    event.preventDefault();
    event.stopPropagation();
    const playerId = event.dataTransfer.getData("text/plain");
    if (playerId) placePlayer(playerId, partyId, beforeId);
  }

  function suggestParties() {
    if (!board) return;
    const raidId = suggestRaidId || null;
    // Tope del juego: 8 parties por raid (y por el grupo "sin raid").
    const room = MAX_PARTIES_PER_RAID - partiesInRaid(raidId).length;
    const where = raidId ? (scopeRaids.find((raid) => raid.id === raidId)?.name ?? "ese raid") : "«Sin raid»";
    if (room <= 0) {
      setMessage({
        kind: "error",
        text: `${where} ya tiene sus ${MAX_PARTIES_PER_RAID} parties. Agrega otro raid y elígelo en «Crear en».`,
      });
      return;
    }

    const pool: Player[] = roster
      .filter((member) => coreIds.has(member.id) && !partyOf.has(member.id))
      .map((member) => {
        const clase = normalizeClass(member.clase);
        return { id: member.id, nickname: member.nickname, clase, rol: inferRole(clase), partyId: null };
      });
    if (pool.length === 0) {
      setMessage({ kind: "error", text: "No quedan jugadores sin asignar para sugerir parties." });
      return;
    }

    const result = fillPartiesFromPool(pool, compositions, room, "Party", partiesInRaid(raidId).length, raidId);
    if (result.parties.length === 0) {
      setMessage({
        kind: "error",
        text: "Con los jugadores sin asignar no alcanza para armar una party con esa composición (falta tanque o soporte).",
      });
      return;
    }

    // Los ids que genera el algoritmo pueden repetirse con los de una
    // composición cargada: se reemplazan por ids propios.
    const idMap = new Map(result.parties.map((party) => [party.id, newId("party")]));
    const suggested: Record<string, string[]> = {};
    for (const player of pool) {
      const partyId = idMap.get(result.assignments[player.id] ?? "");
      if (partyId) (suggested[partyId] ??= []).push(player.id);
    }
    patchBoard((current) => ({
      ...current,
      parties: [
        ...current.parties,
        ...result.parties.map((party) => ({
          ...party,
          id: idMap.get(party.id) ?? party.id,
          capacity: PARTY_SIZE,
          campo: scopeCampo,
          raidId,
        })),
      ],
      members: { ...current.members, ...suggested },
    }));

    const left = pool.length - Object.keys(result.assignments).length;
    const full = partiesInRaid(raidId).length + result.parties.length >= MAX_PARTIES_PER_RAID;
    setMessage({
      kind: "ok",
      text:
        `Se sugirieron ${result.parties.length} party(s) en ${where}.` +
        (left > 0
          ? ` Quedaron ${left} jugador(es) sin asignar${full ? `: ${where} llegó al tope de ${MAX_PARTIES_PER_RAID} parties, agrega otro raid para seguir` : ", ubícalos a mano o cambia la composición"}.`
          : ""),
    });
  }

  function loadSaved(event: PlannerEvent) {
    if (!event.saved) return;
    const saved = event.saved;
    patchBoard(() => boardFromSnapshot(saved.data, { id: saved.id, eventId: event.id }));
    setMessage({ kind: "ok", text: "Se cargó la composición guardada de ese día." });
  }

  function save() {
    if (!board || !eventType) return;
    const event = events.find((candidate) => candidate.id === board.eventId);
    if (!event) {
      setMessage({ kind: "error", text: `Elige el día del evento (${EVENT_DAYS[eventType]}) antes de guardar.` });
      return;
    }

    const toPlayer = (member: PlannerMember, partyId: string | null): Player => {
      const clase = normalizeClass(member.clase);
      return { id: member.id, nickname: member.nickname, clase, rol: inferRole(clase), partyId };
    };
    // Primero los asignados, party por party y en el orden que se les dio:
    // el roster del inicio respeta el orden de esta lista.
    const players: Player[] = [
      ...board.parties.flatMap((party) => membersOf(party.id).map((member) => toPlayer(member, party.id))),
      ...roster
        .filter((member) => coreIds.has(member.id) && !partyOf.has(member.id))
        .map((member) => toPlayer(member, null)),
    ];
    const data: PartyTemplateSnapshot = { players, parties: board.parties, raids: board.raids };
    const name = `${EVENT_LABEL[eventType]} — ${event.label}`;

    setMessage(null);
    startSaving(async () => {
      try {
        // Una sola composición por evento: si ese día ya tiene una (la cargada
        // en pantalla u otra guardada antes), se actualiza en vez de sumar.
        const existingId = board.template?.eventId === event.id ? board.template.id : event.saved?.id;
        const result = existingId
          ? await updatePartyTemplate(existingId, name, data)
          : await createPartyTemplate(eventType, name, data, event.id);
        patchBoard((current) => ({ ...current, template: { id: result.id, eventId: event.id } }));
        setMessage({
          kind: "ok",
          text: `${EVENT_LABEL[eventType]} del ${event.label} guardado. Ya aparece en el roster de cada jugador.`,
        });
        router.refresh();
      } catch (err) {
        setMessage({ kind: "error", text: err instanceof Error ? err.message : "No se pudo guardar." });
      }
    });
  }

  const typeEvents = eventType ? events.filter((event) => event.category === eventType) : [];
  const selectedEvent = board ? typeEvents.find((event) => event.id === board.eventId) : undefined;
  const assignedCount = partyOf.size;
  const interactive = Boolean(board) && canManage;

  function renderChip(member: PlannerMember, inParty: Party | null) {
    const color = colors[member.clase] ?? FALLBACK_COLOR;
    // En el pool, quien ya tiene party queda atenuado con el nombre de su party.
    const assignedTo = inParty ? undefined : partyById.get(partyOf.get(member.id) ?? "");
    return (
      <div
        key={member.id}
        draggable={interactive}
        onDragStart={(event) => event.dataTransfer.setData("text/plain", member.id)}
        onDragOver={inParty ? (event) => event.preventDefault() : undefined}
        onDrop={inParty ? (event) => handleDrop(event, inParty.id, member.id) : undefined}
        onClick={(event) => {
          event.stopPropagation();
          if (interactive) setSelectedId((prev) => (prev === member.id ? null : member.id));
        }}
        title={assignedTo ? `Ya va en ${assignedTo.name}` : undefined}
        style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
        className={`flex min-w-0 items-center gap-1 rounded-lg border-2 px-2 py-1.5 ${
          interactive ? "cursor-grab active:cursor-grabbing" : ""
        } ${selectedId === member.id ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""} ${
          assignedTo ? "opacity-40" : ""
        }`}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">{member.nickname}</span>
          <span className="truncate text-[11px] text-muted">
            {member.clase}
            {assignedTo ? ` · ${assignedTo.name}` : ""}
          </span>
        </span>
        {inParty && canManage && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              placePlayer(member.id, null);
            }}
            aria-label={`Sacar a ${member.nickname} de ${inParty.name}`}
            title="Sacar de la party (vuelve al core)"
            className="shrink-0 rounded text-muted hover:text-rose-400"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  function renderParty(party: Party) {
    const occupants = membersOf(party.id);
    return (
      <div
        key={party.id}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, party.id)}
        onClick={() => selectedId && placePlayer(selectedId, party.id)}
        className={`flex min-w-0 flex-col gap-1.5 rounded-xl border bg-background-elevated p-2 ${
          selectedId ? "cursor-pointer border-accent/60" : "border-border"
        }`}
      >
        <div className="flex items-center gap-1">
          <input
            value={party.name}
            disabled={!canManage}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              patchBoard((current) => ({
                ...current,
                parties: current.parties.map((p) => (p.id === party.id ? { ...p, name: event.target.value } : p)),
              }))
            }
            aria-label="Nombre de la party"
            className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-foreground outline-none focus:text-accent"
          />
          <span className="shrink-0 text-xs text-muted">
            {occupants.length}/{party.capacity}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeParty(party.id);
              }}
              aria-label={`Eliminar ${party.name}`}
              title="Eliminar la party (sus jugadores vuelven al core)"
              className="shrink-0 text-muted hover:text-rose-400"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        {occupants.map((member) => renderChip(member, party))}
        {Array.from({ length: Math.max(0, party.capacity - occupants.length) }, (_, index) => (
          <div key={index} className="h-11 rounded-lg border border-dashed border-border" aria-hidden="true" />
        ))}
      </div>
    );
  }

  // Fila compacta de una party en el resumen flotante: sirve de destino para
  // soltar o tocar sin tener a la vista la sección de equipos.
  function renderDockParty(party: Party) {
    const count = (board?.members[party.id] ?? []).length;
    const isFull = count >= party.capacity;
    return (
      <button
        key={party.id}
        type="button"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, party.id)}
        onClick={() => selectedId && placePlayer(selectedId, party.id)}
        className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs ${
          isFull
            ? "border-border text-muted"
            : selectedId
              ? "border-accent text-foreground hover:bg-accent/10"
              : "border-border text-foreground hover:border-accent/60"
        }`}
      >
        <span className="truncate font-semibold">{party.name}</span>
        <span className={`shrink-0 ${isFull ? "text-emerald-400" : "text-muted"}`}>
          {count}/{party.capacity}
        </span>
      </button>
    );
  }

  const partyGrid = "grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2";
  const showDock = teamsOffscreen && interactive;

  return (
    // Con el resumen flotante a la vista se reserva su ancho a la derecha.
    <div className={`mx-auto max-w-6xl px-4 py-10 sm:px-6 ${showDock ? "lg:pr-64" : ""}`}>
      <h1 className="heading-gradient text-2xl font-extrabold sm:text-3xl">Party Builder</h1>
      <p className="mt-1 text-sm text-muted">
        Arma las raids y parties de cada evento con los miembros del core. Arrastra un jugador a una party, o tócalo
        y luego toca la party. Dentro de una party, arrástralo sobre otro jugador para cambiar el orden.
      </p>

      {/* ============ 1. CORE SPECIAL DELIVERY ============ */}
      <section
        className="mt-6 rounded-xl border border-border bg-surface p-5"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, null)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Users size={18} className="text-accent" />
              CORE Special Delivery
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {members.length} jugador(es) con el rol [SD] Core
              {board && eventType ? ` · ${assignedCount} asignado(s) en ${EVENT_LABEL[eventType]}` : ""}. Suelta aquí a
              un jugador para sacarlo de su party.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortBy((prev) => (prev === "job" ? "name" : "job"))}
              className="flex items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-surface-hover"
            >
              <ArrowDownAZ size={14} />
              Ordenado por {sortBy === "job" ? "job" : "nombre"}
            </button>
            <button
              type="button"
              onClick={() => setShowColors((prev) => !prev)}
              aria-label="Configurar la paleta de colores por job"
              aria-expanded={showColors}
              className={`flex h-9 w-9 items-center justify-center rounded-[10px] border ${
                showColors ? "border-accent text-accent" : "border-border text-muted hover:text-foreground"
              }`}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {showColors && (
          <div className="mt-4 rounded-[10px] border border-border bg-background-elevated p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Color de cada job</p>
              <button type="button" onClick={resetColors} className="text-xs text-accent hover:underline">
                Volver a los colores por defecto
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {jobs.map((job) => (
                <label key={job} className="flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="color"
                    value={colors[job] ?? FALLBACK_COLOR}
                    onChange={(event) => updateColor(job, event.target.value)}
                    className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <span className="truncate">{job}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">La paleta se guarda en este navegador, solo para ti.</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
          {sortedPool.map((member) => renderChip(member, null))}
        </div>
        {members.length === 0 && (
          <p className="mt-2 text-sm text-muted">No se encontraron miembros con el rol [SD] Core.</p>
        )}
      </section>

      {/* ============ 2. CONFIGURACIÓN DE EQUIPOS ============ */}
      <section ref={teamsRef} className="mt-6 scroll-mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground">Configuración de equipos</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(EVENT_LABEL) as EventType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setEventType(type);
                setSelectedId(null);
                setSuggestRaidId("");
                setMessage(null);
              }}
              className={`rounded-[10px] border px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
                eventType === type
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-foreground hover:bg-surface-hover"
              }`}
            >
              {EVENT_LABEL[type]}
            </button>
          ))}
        </div>

        {!board || !eventType ? (
          <p className="mt-4 rounded-[10px] border border-dashed border-border p-5 text-center text-sm text-muted">
            Elige el tipo de evento para empezar a armar sus raids y parties.
          </p>
        ) : (
          <>
            {eventType === "GUILD_LEAGUE" && (
              <div className="mt-3 flex gap-1 border-b border-border">
                {(Object.keys(CAMPO_LABEL) as CampoSide[]).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => {
                      setCampo(side);
                      setSuggestRaidId("");
                    }}
                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
                      campo === side ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    {CAMPO_LABEL[side]}
                  </button>
                ))}
              </div>
            )}

            {canManage && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addRaid}
                  className="flex items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-surface-hover"
                >
                  <Plus size={14} />
                  Agregar raid
                </button>
                <button
                  type="button"
                  onClick={() => addParty(null)}
                  className="flex items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-surface-hover"
                >
                  <Plus size={14} />
                  Agregar party
                </button>
                <span className="text-xs text-muted">
                  Cada raid admite hasta {MAX_PARTIES_PER_RAID} parties de {PARTY_SIZE}.
                </span>
              </div>
            )}

            {/* ---- Sugerir parties por composición ---- */}
            {canManage && (
              <div className="mt-4 rounded-[10px] border border-border bg-background-elevated p-4">
                <p className="text-sm font-semibold text-foreground">Sugerir parties por composición</p>
                <p className="mt-0.5 text-xs text-muted">
                  Define uno o más tipos de party. Se arman con los jugadores sin asignar hasta completar las{" "}
                  {MAX_PARTIES_PER_RAID} parties del raid elegido, alternando los tipos, sin repetir job dentro de una
                  party y con un máximo de un músico y un healer por party.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {compositions.map((composition, compositionIndex) => (
                    <div key={compositionIndex} className="flex flex-wrap items-center gap-2">
                      <span className="w-14 text-xs text-muted">Tipo {compositionIndex + 1}</span>
                      {composition.map((slot, slotIndex) => (
                        <select
                          key={slotIndex}
                          value={slot}
                          onChange={(event) =>
                            setCompositions((prev) =>
                              prev.map((current, index) =>
                                index === compositionIndex
                                  ? current.map((value, i) => (i === slotIndex ? (event.target.value as SlotLabel) : value))
                                  : current
                              )
                            )
                          }
                          aria-label={`Tipo ${compositionIndex + 1}, cupo ${slotIndex + 1}`}
                          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                        >
                          {SLOT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ))}
                      {compositions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCompositions((prev) => prev.filter((_, index) => index !== compositionIndex))}
                          aria-label={`Quitar el tipo ${compositionIndex + 1}`}
                          className="text-muted hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCompositions((prev) => [...prev, DEFAULT_COMPOSITION])}
                    className="text-xs text-accent hover:underline"
                  >
                    + Otro tipo de composición
                  </button>
                  <label className="ml-auto flex items-center gap-2 text-xs text-muted">
                    Crear en
                    <select
                      value={suggestRaidId}
                      onChange={(event) => setSuggestRaidId(event.target.value)}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                    >
                      <option value="">Sin raid</option>
                      {scopeRaids.map((raid) => (
                        <option key={raid.id} value={raid.id}>
                          {raid.name} ({partiesInRaid(raid.id).length}/{MAX_PARTIES_PER_RAID})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={suggestParties} className="btn-brand flex items-center gap-2 px-3 py-2 text-xs">
                    <Sparkles size={14} />
                    Sugerir partys
                  </button>
                </div>
              </div>
            )}

            {message && (
              <p
                role="status"
                className={`mt-4 rounded-[10px] border px-3 py-2 text-sm ${
                  message.kind === "ok"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-400"
                }`}
              >
                {message.text}
              </p>
            )}

            {/* ---- Raids y parties ---- */}
            {scopeRaids.map((raid) => {
              const raidParties = partiesInRaid(raid.id);
              return (
                <div key={raid.id} className="mt-4 rounded-xl border border-border p-3">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <input
                      value={raid.name}
                      disabled={!canManage}
                      onChange={(event) =>
                        patchBoard((current) => ({
                          ...current,
                          raids: current.raids.map((r) => (r.id === raid.id ? { ...r, name: event.target.value } : r)),
                        }))
                      }
                      aria-label="Nombre del raid"
                      className="min-w-0 flex-1 bg-transparent font-semibold text-foreground outline-none focus:text-accent"
                    />
                    <span className="text-xs text-muted">
                      {raidParties.length}/{MAX_PARTIES_PER_RAID} parties
                    </span>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => addParty(raid.id)}
                          disabled={raidParties.length >= MAX_PARTIES_PER_RAID}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover disabled:opacity-40"
                        >
                          <Plus size={12} />
                          Party
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRaid(raid.id)}
                          aria-label={`Eliminar ${raid.name} y sus parties`}
                          title="Eliminar el raid y sus parties (los jugadores vuelven al core)"
                          className="text-muted hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  {raidParties.length === 0 ? (
                    <p className="text-xs text-muted">Este raid todavía no tiene parties.</p>
                  ) : (
                    <div className={partyGrid}>{raidParties.map(renderParty)}</div>
                  )}
                </div>
              );
            })}

            {partiesInRaid(null).length > 0 && (
              <div className="mt-4">
                {scopeRaids.length > 0 && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Parties sin raid</p>
                )}
                <div className={partyGrid}>{partiesInRaid(null).map(renderParty)}</div>
              </div>
            )}

            {scopeRaids.length === 0 && scopeParties.length === 0 && (
              <p className="mt-4 rounded-[10px] border border-dashed border-border p-5 text-center text-sm text-muted">
                Todavía no hay raids ni parties
                {eventType === "GUILD_LEAGUE" ? ` en ${CAMPO_LABEL[campo]}` : ""}. Agrégalas o usa «Sugerir partys».
              </p>
            )}

            {/* ---- Guardado del evento ---- */}
            {canManage && (
              <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <label className="text-xs text-muted">
                  Día del evento ({EVENT_DAYS[eventType]})
                  <select
                    value={board.eventId}
                    onChange={(event) => patchBoard((current) => ({ ...current, eventId: event.target.value }))}
                    className="mt-1 block min-w-[220px] rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm capitalize text-foreground"
                  >
                    <option value="">Elige el día…</option>
                    {typeEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.label}
                        {event.saved ? " · ya tiene composición" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedEvent?.saved && selectedEvent.saved.id !== board.template?.id && (
                  <button
                    type="button"
                    onClick={() => loadSaved(selectedEvent)}
                    className="rounded-[10px] border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-surface-hover"
                  >
                    Cargar la guardada (reemplaza lo de pantalla)
                  </button>
                )}
                <button type="button" onClick={save} disabled={isSaving} className="btn-brand px-4 py-2 text-sm disabled:opacity-50">
                  {isSaving ? "Guardando…" : `Guardar ${EVENT_LABEL[eventType]}`}
                </button>
                {typeEvents.length === 0 && (
                  <p className="w-full text-xs text-amber-400">
                    No hay eventos próximos de {EVENT_LABEL[eventType]} creados. Créalos en Eventos → Semana de
                    asistencia para poder guardar.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ============ RESUMEN FLOTANTE DE EQUIPOS ============ */}
      {/* Mientras la sección de equipos queda fuera de pantalla (el core es
          largo), este panel fijo a la derecha deja seguir asignando. */}
      {showDock && board && eventType && (
        <aside
          aria-label="Resumen de la configuración de equipos"
          // En pantallas angostas pasa a ser una franja abajo, para no tapar el core.
          className="fixed bottom-4 right-4 top-20 z-30 flex w-56 flex-col rounded-xl border border-accent/40 bg-background-elevated shadow-2xl max-sm:left-4 max-sm:top-auto max-sm:h-64 max-sm:w-auto"
        >
          <div className="border-b border-border p-3">
            <p className="text-sm font-semibold text-foreground">Configuración de equipos</p>
            <p className="text-xs text-muted">
              {EVENT_LABEL[eventType]} · {assignedCount} asignado(s)
            </p>
            {eventType === "GUILD_LEAGUE" && (
              <div className="mt-2 flex gap-1">
                {(Object.keys(CAMPO_LABEL) as CampoSide[]).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setCampo(side)}
                    className={`flex-1 rounded-md border px-1 py-1 text-[11px] font-semibold ${
                      campo === side ? "border-accent text-accent" : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {side === "principal" ? "Primario" : "Secundario"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <p className="mb-2 text-[11px] text-muted">
              {selectedId
                ? `Toca la party para ${memberById.get(selectedId)?.nickname ?? "el jugador"}.`
                : "Arrastra un jugador a su party, o tócalo y luego toca la party."}
            </p>
            {scopeRaids.map((raid) => (
              <div key={raid.id} className="mb-3">
                <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{raid.name}</p>
                <div className="flex flex-col gap-1">{partiesInRaid(raid.id).map(renderDockParty)}</div>
              </div>
            ))}
            {partiesInRaid(null).length > 0 && (
              <div className="mb-3">
                {scopeRaids.length > 0 && (
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Sin raid</p>
                )}
                <div className="flex flex-col gap-1">{partiesInRaid(null).map(renderDockParty)}</div>
              </div>
            )}
            {scopeParties.length === 0 && (
              <p className="text-xs text-muted">Todavía no hay parties. Baja a crearlas.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => teamsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex items-center justify-center gap-2 border-t border-border p-2 text-xs font-semibold text-accent hover:bg-accent/10"
          >
            <ArrowDown size={14} />
            Ir a los equipos
          </button>
        </aside>
      )}
    </div>
  );
}
