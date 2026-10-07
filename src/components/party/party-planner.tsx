"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownAZ, Plus, Settings, Sparkles, Trash2, Users, X } from "lucide-react";
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
  /** discordId -> id de la party donde va. */
  assign: Record<string, string>;
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
const PARTY_SIZE = 5;

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
  return { parties: [], raids: [], assign: {}, eventId: "", template: null };
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function boardFromSnapshot(snapshot: PartyTemplateSnapshot, template: { id: string; eventId: string }): Board {
  const assign: Record<string, string> = {};
  for (const player of snapshot.players) {
    if (player.partyId) assign[player.id] = player.partyId;
  }
  return { parties: snapshot.parties, raids: snapshot.raids, assign, eventId: template.eventId, template };
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

  const sortedPool = useMemo(() => {
    const visible = roster.filter((member) => members.some((m) => m.id === member.id) || board?.assign[member.id]);
    return [...visible].sort((a, b) =>
      sortBy === "job"
        ? a.clase.localeCompare(b.clase) || a.nickname.localeCompare(b.nickname)
        : a.nickname.localeCompare(b.nickname)
    );
  }, [roster, members, board, sortBy]);
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
    Object.entries(board?.assign ?? {})
      .filter(([, assigned]) => assigned === partyId)
      .map(([playerId]) => memberById.get(playerId))
      .filter((member): member is PlannerMember => Boolean(member));

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
    patchBoard((current) => ({
      ...current,
      parties: [
        ...current.parties,
        {
          id: newId("party"),
          name: `Party ${current.parties.filter((party) => party.campo === scopeCampo).length + 1}`,
          capacity: PARTY_SIZE,
          campo: scopeCampo,
          raidId,
        },
      ],
    }));
  }

  function removeParty(partyId: string) {
    patchBoard((current) => ({
      ...current,
      parties: current.parties.filter((party) => party.id !== partyId),
      assign: Object.fromEntries(Object.entries(current.assign).filter(([, assigned]) => assigned !== partyId)),
    }));
  }

  function removeRaid(raidId: string) {
    patchBoard((current) => {
      const gone = new Set(current.parties.filter((party) => party.raidId === raidId).map((party) => party.id));
      return {
        ...current,
        raids: current.raids.filter((raid) => raid.id !== raidId),
        parties: current.parties.filter((party) => !gone.has(party.id)),
        assign: Object.fromEntries(Object.entries(current.assign).filter(([, assigned]) => !gone.has(assigned))),
      };
    });
  }

  function assignPlayer(playerId: string, partyId: string | null) {
    if (!board) return;
    setMessage(null);
    if (partyId) {
      const party = partyById.get(partyId);
      const occupants = membersOf(partyId).filter((member) => member.id !== playerId).length;
      if (party && occupants >= party.capacity) {
        setMessage({ kind: "error", text: `${party.name} ya está completa (${party.capacity}/${party.capacity}).` });
        return;
      }
    }
    patchBoard((current) => {
      const assign = { ...current.assign };
      if (partyId) assign[playerId] = partyId;
      else delete assign[playerId];
      return { ...current, assign };
    });
    setSelectedId(null);
  }

  function handleDrop(event: React.DragEvent, partyId: string | null) {
    event.preventDefault();
    const playerId = event.dataTransfer.getData("text/plain");
    if (playerId) assignPlayer(playerId, partyId);
  }

  function suggestParties() {
    if (!board) return;
    const pool: Player[] = roster
      .filter((member) => members.some((m) => m.id === member.id) && !board.assign[member.id])
      .map((member) => {
        const clase = normalizeClass(member.clase);
        return { id: member.id, nickname: member.nickname, clase, rol: inferRole(clase), partyId: null };
      });
    if (pool.length === 0) {
      setMessage({ kind: "error", text: "No quedan jugadores sin asignar para sugerir parties." });
      return;
    }

    const raidId = suggestRaidId || null;
    const result = fillPartiesFromPool(pool, compositions, undefined, "Party", scopeParties.length, raidId);
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
    patchBoard((current) => ({
      ...current,
      parties: [
        ...current.parties,
        ...result.parties.map((party) => ({ ...party, id: idMap.get(party.id) ?? party.id, campo: scopeCampo, raidId })),
      ],
      assign: {
        ...current.assign,
        ...Object.fromEntries(
          Object.entries(result.assignments).map(([playerId, partyId]) => [playerId, idMap.get(partyId) ?? partyId])
        ),
      },
    }));
    const left = pool.length - Object.keys(result.assignments).length;
    setMessage({
      kind: "ok",
      text: `Se sugirieron ${result.parties.length} party(s).${left > 0 ? ` Quedaron ${left} jugador(es) sin asignar: ubícalos a mano.` : ""}`,
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

    const players: Player[] = roster
      .filter((member) => members.some((m) => m.id === member.id) || board.assign[member.id])
      .map((member) => {
        const clase = normalizeClass(member.clase);
        return {
          id: member.id,
          nickname: member.nickname,
          clase,
          rol: inferRole(clase),
          partyId: board.assign[member.id] ?? null,
        };
      });
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
  const assignedCount = board ? Object.keys(board.assign).length : 0;

  function renderChip(member: PlannerMember, where: "pool" | "party") {
    const color = colors[member.clase] ?? FALLBACK_COLOR;
    const assignedTo = where === "pool" && board ? partyById.get(board.assign[member.id] ?? "") : undefined;
    return (
      <div
        key={member.id}
        draggable={Boolean(board) && canManage}
        onDragStart={(event) => event.dataTransfer.setData("text/plain", member.id)}
        onClick={(event) => {
          event.stopPropagation();
          if (board && canManage) setSelectedId((prev) => (prev === member.id ? null : member.id));
        }}
        title={assignedTo ? `Ya va en ${assignedTo.name}` : undefined}
        style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
        className={`flex min-w-0 flex-col justify-center rounded-lg border-2 px-2 py-1.5 ${
          board && canManage ? "cursor-grab active:cursor-grabbing" : ""
        } ${selectedId === member.id ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""} ${
          assignedTo ? "opacity-40" : ""
        }`}
      >
        <span className="truncate text-sm font-semibold text-foreground">{member.nickname}</span>
        <span className="truncate text-[11px] text-muted">
          {member.clase}
          {assignedTo ? ` · ${assignedTo.name}` : ""}
        </span>
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
        onClick={() => selectedId && assignPlayer(selectedId, party.id)}
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
              className="shrink-0 text-muted hover:text-rose-400"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {occupants.map((member) => renderChip(member, "party"))}
        {Array.from({ length: Math.max(0, party.capacity - occupants.length) }, (_, index) => (
          <div key={index} className="h-11 rounded-lg border border-dashed border-border" aria-hidden="true" />
        ))}
      </div>
    );
  }

  const partyGrid = "grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="heading-gradient text-2xl font-extrabold sm:text-3xl">Party Builder</h1>
      <p className="mt-1 text-sm text-muted">
        Arma las raids y parties de cada evento con los miembros del core. Arrastra un jugador a una party, o tócalo
        y luego toca la party.
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
              {board ? ` · ${assignedCount} asignado(s) en ${eventType ? EVENT_LABEL[eventType] : ""}` : ""}. Suelta aquí
              a un jugador para sacarlo de su party.
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
          {sortedPool.map((member) => renderChip(member, "pool"))}
        </div>
        {members.length === 0 && (
          <p className="mt-2 text-sm text-muted">No se encontraron miembros con el rol [SD] Core.</p>
        )}
      </section>

      {/* ============ 2. CONFIGURACIÓN DE EQUIPOS ============ */}
      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
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
              <div className="mt-4 flex flex-wrap gap-2">
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
              </div>
            )}

            {/* ---- Sugerir parties por composición ---- */}
            {canManage && (
              <div className="mt-4 rounded-[10px] border border-border bg-background-elevated p-4">
                <p className="text-sm font-semibold text-foreground">Sugerir parties por composición</p>
                <p className="mt-0.5 text-xs text-muted">
                  Define uno o más tipos de party. Se arman con los jugadores sin asignar, alternando los tipos, sin
                  repetir job dentro de una party y con un máximo de un músico y un healer por party.
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
                          {raid.name}
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
              const raidParties = scopeParties.filter((party) => party.raidId === raid.id);
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
                    <span className="text-xs text-muted">{raidParties.length} party(s)</span>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => addParty(raid.id)}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover"
                        >
                          <Plus size={12} />
                          Party
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRaid(raid.id)}
                          aria-label={`Eliminar ${raid.name} y sus parties`}
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

            {scopeParties.some((party) => !party.raidId) && (
              <div className="mt-4">
                {scopeRaids.length > 0 && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Parties sin raid</p>
                )}
                <div className={partyGrid}>{scopeParties.filter((party) => !party.raidId).map(renderParty)}</div>
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
    </div>
  );
}
