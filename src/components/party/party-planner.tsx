"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EventAttendanceMode, EventSignupStatus } from "@prisma/client";
import {
  ArrowDown,
  ArrowDownAZ,
  CloudCheck,
  CloudUpload,
  CornerDownRight,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { savePermanentComposition } from "@/lib/actions/party-templates";
import { ATTENDANCE_DOT_CLASS, ATTENDANCE_TEXT_CLASS, attendanceMark } from "@/lib/party/attendance";
import type { EventChannelOption } from "@/lib/discord-guild-channels";
import { inferRole, normalizeClass } from "@/lib/party/infer-role";
import {
  MAX_PARTIES_PER_RAID,
  PARTY_SIZE,
  boardFromSnapshot,
  emptyBoard,
  type DraftBoard,
  type DraftEditor,
  type DraftPayload,
} from "@/lib/party/draft-ops";
import { DraftChannel } from "@/lib/party/draft-sync";
import type { PartyTemplateSnapshot } from "@/lib/party/template-snapshot";
import { fillPartiesFromPool } from "@/lib/party/use-campo";
import type { CampoSide, Party, Player, SlotLabel } from "@/types/party";

export type PlannerEventType = "GUILD_LEAGUE" | "EMPERIUM_OVERRUN";
type EventType = PlannerEventType;

export interface PlannerMember {
  id: string;
  nickname: string;
  clase: string;
}

/** Composición permanente guardada de un tipo de evento. */
export interface PlannerComposition {
  id: string;
  data: PartyTemplateSnapshot;
  /** Canal donde se informó la última vez, para proponerlo de nuevo. */
  channelId: string | null;
  updatedAt: string;
}

/** Encuesta de asistencia del próximo evento de ese tipo. */
export interface PlannerAttendance {
  /** Fecha ya formateada, ej. "martes 13/10". */
  label: string;
  /** false = el evento existe pero todavía no se envió la encuesta a Discord. */
  published: boolean;
  mode: EventAttendanceMode;
  /** discordId -> respuesta; quien no respondió no figura. */
  statuses: Record<string, EventSignupStatus>;
}

const EVENT_LABEL: Record<EventType, string> = {
  GUILD_LEAGUE: "Guild League",
  EMPERIUM_OVERRUN: "Emperium Overrun",
};
const CAMPO_LABEL: Record<CampoSide, string> = { principal: "Campo Primario", secundario: "Campo Secundario" };
const SLOT_OPTIONS: SlotLabel[] = ["Tanque", "Soporte", "Daño", "Flexible"];
const DEFAULT_COMPOSITION: SlotLabel[] = ["Tanque", "Soporte", "Daño", "Daño", "Daño"];
// Cada cuánto se consulta el borrador compartido con la pestaña visible.
const POLL_INTERVAL_MS = 2500;

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
  Gunslinger: "#c0a16b",
  Professor: "#5dade2",
  "High Wizard": "#3d7eff",
  Doram: "#6fe0f5",
};
const FALLBACK_COLOR = "#7a8794";
const SAVED_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});
const COLORS_STORAGE_KEY = "sd-party-job-colors";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Borrador "de lectura" armado con la composición publicada, para quien no puede editar. */
function payloadFromComposition(composition: PlannerComposition | null): DraftPayload {
  return {
    version: 0,
    publishedVersion: 0,
    board: composition ? boardFromSnapshot(composition.data) : emptyBoard(),
    updatedByName: null,
    updatedAt: composition?.updatedAt ?? new Date(0).toISOString(),
    publishedAt: composition?.updatedAt ?? null,
    publishedByName: null,
  };
}

interface PartyPlannerProps {
  canManage: boolean;
  members: PlannerMember[];
  /** La composición permanente vigente de cada tipo de evento. */
  compositions: Record<EventType, PlannerComposition | null>;
  /** Borrador compartido de cada tipo de evento; null para quien no puede editar. */
  drafts: Record<EventType, DraftPayload> | null;
  /** Quién avisó que juega el próximo evento de cada tipo. */
  attendance: Record<EventType, PlannerAttendance | null>;
  /** Canales de Discord donde se puede informar la composición. */
  channels: EventChannelOption[];
  /** Canal de asistencia configurado en Eventos: el propuesto por defecto. */
  defaultChannelId: string | null;
  /** Plantilla del historial abierta con "Editar". */
  editing: { id: string; category: EventType; data: PartyTemplateSnapshot } | null;
}

/**
 * Party Builder: arriba el core de la guild (todos los [SD] Core, con su job),
 * abajo la configuración de equipos de cada tipo de evento. Cada tipo tiene
 * una composición permanente, no atada a un día: se va modificando según lo
 * que necesite la guild y de ella sale el roster que ve cada jugador en el
 * inicio del panel. La asistencia del próximo evento solo se cruza para
 * controlar quién de la composición avisó que juega.
 *
 * Los oficiales editan a la vez un borrador compartido que se guarda solo
 * en el servidor con cada cambio (ver src/lib/party/draft-sync.ts) y se
 * consulta cada pocos segundos para ver lo que hacen los demás. "Guardar
 * composición" publica ese borrador: es lo que ven los jugadores.
 */
export function PartyPlanner({
  canManage,
  members,
  compositions: savedCompositions,
  drafts,
  attendance,
  channels,
  defaultChannelId,
  editing,
}: PartyPlannerProps) {
  const router = useRouter();
  const [eventType, setEventType] = useState<EventType | null>(editing?.category ?? "GUILD_LEAGUE");
  const [campo, setCampo] = useState<CampoSide>("principal");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const live = canManage && drafts !== null;
  // Un canal de sincronización por tipo de evento, con su borrador compartido
  // (o, para quien solo mira, la composición publicada).
  const [syncChannels] = useState<Record<EventType, DraftChannel>>(() => {
    const create = (type: EventType) =>
      new DraftChannel(
        type,
        drafts?.[type] ?? payloadFromComposition(savedCompositions[type]),
        (text) => setMessage({ kind: "error", text }),
        live
      );
    return { GUILD_LEAGUE: create("GUILD_LEAGUE"), EMPERIUM_OVERRUN: create("EMPERIUM_OVERRUN") };
  });
  const [editors, setEditors] = useState<DraftEditor[]>([]);
  const [offline, setOffline] = useState(false);
  // La plantilla del historial abierta con "Editar" no se carga sola: pisaría
  // el borrador de todos. Se ofrece cargarla.
  const [editingPending, setEditingPending] = useState(Boolean(editing && live));
  const [notify, setNotify] = useState(false);
  const [notifyChannel, setNotifyChannel] = useState<Record<EventType, string>>(() => {
    const fallback = defaultChannelId ?? channels[0]?.id ?? "";
    return {
      GUILD_LEAGUE: savedCompositions.GUILD_LEAGUE?.channelId ?? fallback,
      EMPERIUM_OVERRUN: savedCompositions.EMPERIUM_OVERRUN?.channelId ?? fallback,
    };
  });
  const [sortBy, setSortBy] = useState<"name" | "job">("job");
  const [colors, setColors] = useState<Record<string, string>>(DEFAULT_JOB_COLORS);
  const [showColors, setShowColors] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compositions, setCompositions] = useState<SlotLabel[][]>([DEFAULT_COMPOSITION]);
  const [suggestRaidId, setSuggestRaidId] = useState("");
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

  const channel = syncChannels[eventType ?? "GUILD_LEAGUE"];
  const draft = useSyncExternalStore(channel.subscribe, channel.getSnapshot, channel.getSnapshot);
  const board = eventType ? draft.board : null;

  // Consulta periódica del borrador del tipo a la vista (y de quién más está
  // editando), solo con la pestaña visible.
  useEffect(() => {
    if (!live || !eventType) return;
    let stopped = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (!stopped) timer = setTimeout(poll, POLL_INTERVAL_MS);
    };
    const poll = async () => {
      if (running || stopped) return;
      if (document.visibilityState !== "visible") return schedule();
      running = true;
      try {
        const response = await fetch(`/panel/party/draft?event=${eventType}&v=${channel.version}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(String(response.status));
        const result = (await response.json()) as { draft: DraftPayload | null; editors: DraftEditor[] };
        if (stopped) return;
        if (result.draft) channel.receive(result.draft);
        setEditors(result.editors);
        setOffline(false);
      } catch {
        if (!stopped) setOffline(true);
      } finally {
        running = false;
      }
      schedule();
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      void poll();
    };
    void poll();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [live, eventType, channel]);

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
    for (const composition of Object.values(savedCompositions)) {
      for (const player of composition?.data.players ?? []) {
        if (!byId.has(player.id)) byId.set(player.id, { id: player.id, nickname: player.nickname, clase: player.clase });
      }
    }
    for (const player of editing?.data.players ?? []) {
      if (!byId.has(player.id)) byId.set(player.id, { id: player.id, nickname: player.nickname, clase: player.clase });
    }
    // Quien otro oficial dejó en el borrador sin estar en el core.
    for (const [id, person] of Object.entries(draft.board.extras ?? {})) {
      if (!byId.has(id)) byId.set(id, { id, ...person });
    }
    return [...byId.values()];
  }, [members, savedCompositions, editing, draft.board.extras]);
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


  // Lo que se ve del tablero: en Guild League, solo el campo elegido.
  const scopeCampo: CampoSide | null = eventType === "GUILD_LEAGUE" ? campo : null;
  const scopeRaids = board?.raids.filter((raid) => (raid.campo ?? null) === scopeCampo) ?? [];
  const scopeParties = board?.parties.filter((party) => party.campo === scopeCampo) ?? [];
  const partyById = new Map(board?.parties.map((party) => [party.id, party]) ?? []);
  const membersOf = (partyId: string, source: DraftBoard | null = board) =>
    (source?.members[partyId] ?? [])
      .map((playerId) => memberById.get(playerId))
      .filter((member): member is PlannerMember => Boolean(member));
  const partiesInRaid = (raidId: string | null) => scopeParties.filter((party) => (party.raidId ?? null) === raidId);

  function addRaid() {
    channel.push({ kind: "addRaid", id: newId("raid"), campo: scopeCampo });
  }

  function addParty(raidId: string | null) {
    setMessage(null);
    if (raidId && partiesInRaid(raidId).length >= MAX_PARTIES_PER_RAID) {
      setMessage({ kind: "error", text: `Un raid admite hasta ${MAX_PARTIES_PER_RAID} parties. Agrega otro raid.` });
      return;
    }
    channel.push({ kind: "addParty", id: newId("party"), campo: scopeCampo, raidId });
  }

  function removeParty(partyId: string) {
    channel.push({ kind: "removeParty", id: partyId });
  }

  function removeRaid(raidId: string) {
    channel.push({ kind: "removeRaid", id: raidId });
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
    channel.push({ kind: "move", playerId, partyId, beforeId: beforeId ?? null });
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
    // composición cargada: se reemplazan por ids propios. El nombre de cada
    // party lo pone el borrador al aplicarla, según las que ya haya.
    const suggested = result.parties.map((party) => ({
      id: newId("party"),
      playerIds: pool.filter((player) => result.assignments[player.id] === party.id).map((player) => player.id),
    }));
    channel.push({ kind: "suggest", campo: scopeCampo, raidId, parties: suggested });

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

  /** Crea una party nueva (en un raid o sin raid) y mete ahí al jugador. */
  function placeInNewParty(playerId: string, raidId: string | null) {
    setMessage(null);
    if (partiesInRaid(raidId).length >= MAX_PARTIES_PER_RAID) {
      setMessage({ kind: "error", text: `Un raid admite hasta ${MAX_PARTIES_PER_RAID} parties. Agrega otro raid.` });
      return;
    }
    channel.push({ kind: "addParty", id: newId("party"), campo: scopeCampo, raidId, playerId });
    setSelectedId(null);
  }

  function save() {
    if (!board || !eventType) return;
    const channelId = notify ? notifyChannel[eventType] : null;
    if (notify && !channelId) {
      setMessage({ kind: "error", text: "Elige el canal de Discord donde informar la composición." });
      return;
    }

    const toPlayer = (member: PlannerMember, partyId: string | null): Player => {
      const clase = normalizeClass(member.clase);
      return { id: member.id, nickname: member.nickname, clase, rol: inferRole(clase), partyId };
    };
    const label = EVENT_LABEL[eventType];
    const target = channel;

    setMessage(null);
    startSaving(async () => {
      try {
        // Se publica el borrador tal como lo confirmó el servidor, con los
        // cambios propios que todavía estaban en camino ya incluidos.
        await target.idle();
        const { confirmed } = target.getSnapshot();
        const published = confirmed.board;
        const assigned = new Set(Object.values(published.members).flat());
        // Primero los asignados, party por party y en el orden que se les dio:
        // el roster del inicio respeta el orden de esta lista.
        const players: Player[] = [
          ...published.parties.flatMap((party) =>
            membersOf(party.id, published).map((member) => toPlayer(member, party.id))
          ),
          ...roster
            .filter((member) => coreIds.has(member.id) && !assigned.has(member.id))
            .map((member) => toPlayer(member, null)),
        ];
        const data: PartyTemplateSnapshot = { players, parties: published.parties, raids: published.raids };
        const result = await savePermanentComposition(
          eventType,
          data,
          channelId,
          live ? confirmed.version : undefined
        );
        if (live) target.markPublished(confirmed.version);
        setMessage(
          result.notifyError
            ? {
                kind: "error",
                text: `Composición de ${label} guardada, pero no se pudo informar por Discord: ${result.notifyError}`,
              }
            : {
                kind: "ok",
                text: `Composición de ${label} guardada${channelId ? " e informada por Discord" : ""}. Ya aparece en el panel de cada jugador.`,
              }
        );
        if (!result.notifyError) setNotify(false);
        router.refresh();
      } catch (err) {
        setMessage({ kind: "error", text: err instanceof Error ? err.message : "No se pudo guardar." });
      }
    });
  }

  /** Reemplaza el borrador de ese tipo de evento por la plantilla abierta con "Editar". */
  function loadEditing() {
    if (!editing) return;
    const replaced = boardFromSnapshot(editing.data);
    // Quien no esté en el core viaja con su nombre y job para que los demás
    // oficiales lo vean.
    const extras = Object.fromEntries(
      editing.data.players
        .filter((player) => player.partyId && !coreIds.has(player.id))
        .map((player) => [player.id, { nickname: player.nickname, clase: player.clase }])
    );
    syncChannels[editing.category].push({ kind: "replace", board: { ...replaced, extras } });
    setEditingPending(false);
    setEventType(editing.category);
    setMessage({
      kind: "ok",
      text: `Se cargó la composición en el borrador de ${EVENT_LABEL[editing.category]}. Guárdala para publicarla.`,
    });
  }

  const assignedCount = partyOf.size;
  const nextEvent = eventType ? attendance[eventType] : null;
  const markOf = (memberId: string) =>
    nextEvent?.published ? attendanceMark(nextEvent.mode, nextEvent.statuses[memberId]) : null;
  // Control de asistencia: de los que están en la composición, cuántos
  // avisaron que juegan el próximo evento.
  const assignedMarks = nextEvent?.published ? [...partyOf.keys()].map(markOf) : [];
  const attendanceSummary = {
    ok: assignedMarks.filter((mark) => mark?.tone === "ok").length,
    late: assignedMarks.filter((mark) => mark?.tone === "late").length,
    no: assignedMarks.filter((mark) => mark?.tone === "no").length,
    unknown: assignedMarks.filter((mark) => mark?.tone === "unknown").length,
  };
  const interactive = Boolean(board) && canManage;

  function renderChip(member: PlannerMember, inParty: Party | null) {
    const color = colors[member.clase] ?? FALLBACK_COLOR;
    // En el pool, quien ya tiene party queda atenuado con el nombre de su party.
    const assignedTo = inParty ? undefined : partyById.get(partyOf.get(member.id) ?? "");
    const mark = markOf(member.id);
    // Tocar un jugador del core abre un menú para mandarlo directo a una
    // party o raid, sin tener que bajar hasta la sección de equipos.
    const showMenu = !inParty && interactive && selectedId === member.id;
    return (
      <div key={member.id} className="relative min-w-0">
      <div
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
          <span className="flex min-w-0 items-center gap-1.5">
            {mark && (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${ATTENDANCE_DOT_CLASS[mark.tone]}`}
                title={`${nextEvent?.label}: ${mark.label}`}
                aria-label={mark.label}
              />
            )}
            <span className="truncate text-sm font-semibold text-foreground">{member.nickname}</span>
          </span>
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
      {showMenu && renderSendMenu(member)}
      </div>
    );
  }

  /** Destinos para el jugador tocado en el core: cada party del campo a la vista o una party nueva. */
  function renderSendMenu(member: PlannerMember) {
    const currentPartyId = partyOf.get(member.id);
    const groups: { raidId: string | null; title: string | null }[] = [
      ...scopeRaids.map((raid) => ({ raidId: raid.id, title: raid.name })),
      { raidId: null, title: scopeRaids.length > 0 ? "Sin raid" : null },
    ];
    return (
      <div
        role="menu"
        aria-label={`Enviar a ${member.nickname}`}
        onClick={(event) => event.stopPropagation()}
        className="absolute left-0 top-full z-40 mt-1 max-h-80 w-60 overflow-y-auto rounded-xl border border-accent/50 bg-background-elevated p-2 shadow-2xl"
      >
        <div className="mb-1 flex items-center justify-between gap-2 px-1">
          <p className="truncate text-xs font-semibold text-foreground">
            Enviar a {member.nickname}
            {eventType === "GUILD_LEAGUE" ? ` · ${CAMPO_LABEL[campo]}` : ""}
          </p>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label="Cerrar"
            className="shrink-0 text-muted hover:text-foreground"
          >
            <X size={13} />
          </button>
        </div>
        {groups.map(({ raidId, title }) => {
          const parties = partiesInRaid(raidId);
          const hasRoom = parties.length < MAX_PARTIES_PER_RAID;
          if (raidId === null && parties.length === 0 && scopeRaids.length > 0) return null;
          return (
            <div key={raidId ?? "none"} className="mt-1">
              {title && (
                <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{title}</p>
              )}
              {parties.map((party) => {
                const count = (board?.members[party.id] ?? []).length;
                const isHere = party.id === currentPartyId;
                const isFull = count >= party.capacity && !isHere;
                return (
                  <button
                    key={party.id}
                    type="button"
                    role="menuitem"
                    disabled={isFull || isHere}
                    onClick={() => placePlayer(member.id, party.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent/10 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span className="flex min-w-0 items-center gap-1">
                      <CornerDownRight size={12} className="shrink-0 text-muted" />
                      <span className="truncate">{party.name}</span>
                    </span>
                    <span className="shrink-0 text-muted">{isHere ? "Aquí" : `${count}/${party.capacity}`}</span>
                  </button>
                );
              })}
              {hasRoom && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => placeInNewParty(member.id, raidId)}
                  className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-accent hover:bg-accent/10"
                >
                  <Plus size={12} />
                  Nueva party{title ? ` en ${title}` : ""}
                </button>
              )}
            </div>
          );
        })}
        {currentPartyId && (
          <button
            type="button"
            role="menuitem"
            onClick={() => placePlayer(member.id, null)}
            className="mt-1 flex w-full items-center gap-1 rounded-md border-t border-border px-2 pt-2 text-left text-xs text-rose-400 hover:text-rose-300"
          >
            <X size={12} />
            Sacar de su party
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
            onChange={(event) => channel.push({ kind: "renameParty", id: party.id, name: event.target.value })}
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
        Arma la composición permanente de cada evento con los miembros del core. Toca un jugador para enviarlo a una
        party o raid, o arrástralo a su party. Dentro de una party, arrástralo sobre otro jugador para cambiar el orden.
        {live && " Cada cambio se guarda solo en un borrador compartido con los demás oficiales."}
      </p>

      {/* ---- Estado del borrador compartido y quién más está editando ---- */}
      {live && eventType && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-border bg-surface px-4 py-2.5 text-xs">
          {offline || draft.status === "retrying" ? (
            <span className="flex items-center gap-1.5 text-amber-400">
              <WifiOff size={14} />
              Sin conexión con el servidor, reintentando…
            </span>
          ) : draft.status === "saving" ? (
            <span className="flex items-center gap-1.5 text-muted">
              <CloudUpload size={14} />
              Guardando en el borrador…
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CloudCheck size={14} />
              Borrador guardado
            </span>
          )}
          {draft.unpublished ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-400">
              Cambios sin publicar en {EVENT_LABEL[eventType]}
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
              {EVENT_LABEL[eventType]}: lo publicado está al día
            </span>
          )}
          {draft.confirmed.updatedByName && (
            <span className="text-muted">
              Último cambio: {draft.confirmed.updatedByName},{" "}
              {SAVED_FORMATTER.format(new Date(draft.confirmed.updatedAt))}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-muted sm:ml-auto">
            <Users size={14} />
            {editors.length === 0
              ? "Nadie más editando ahora"
              : `También editando: ${editors
                  .map((editor) => `${editor.name}${editor.event !== eventType ? ` (en ${EVENT_LABEL[editor.event]})` : ""}`)
                  .join(", ")}`}
          </span>
        </div>
      )}

      {/* ---- Plantilla del historial abierta con "Editar" ---- */}
      {editing && editingPending && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[10px] border border-accent/50 bg-accent/10 px-4 py-3 text-sm">
          <p className="min-w-0 flex-1 text-foreground">
            Abriste una composición del historial de {EVENT_LABEL[editing.category]}. Cargarla reemplaza el borrador
            compartido de ese evento para todos los oficiales (lo publicado no cambia hasta guardar).
          </p>
          <button type="button" onClick={loadEditing} className="btn-brand px-3 py-2 text-xs">
            Cargar en el borrador
          </button>
          <button
            type="button"
            onClick={() => setEditingPending(false)}
            className="text-xs text-muted hover:text-foreground"
          >
            No cargarla
          </button>
        </div>
      )}

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

            {/* ---- Control de asistencia del próximo evento ---- */}
            <div className="mt-4 rounded-[10px] border border-border bg-background-elevated px-4 py-3 text-xs">
              {!nextEvent ? (
                <p className="text-muted">
                  No hay un próximo evento de {EVENT_LABEL[eventType]} creado: cuando exista, aquí se ve quién de la
                  composición avisó que juega.
                </p>
              ) : !nextEvent.published ? (
                <p className="text-muted">
                  El próximo evento ({nextEvent.label}) todavía no se envió a Discord, así que nadie ha respondido la
                  asistencia.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-semibold capitalize text-foreground">Asistencia {nextEvent.label}</span>
                  {(
                    [
                      ["ok", "juegan"],
                      ["late", "llegan tarde"],
                      ["no", "no juegan"],
                      ["unknown", "sin responder"],
                    ] as const
                  ).map(([tone, text]) => (
                    <span key={tone} className={`flex items-center gap-1.5 ${ATTENDANCE_TEXT_CLASS[tone]}`}>
                      <span className={`h-2 w-2 rounded-full ${ATTENDANCE_DOT_CLASS[tone]}`} aria-hidden="true" />
                      {attendanceSummary[tone]} {text}
                    </span>
                  ))}
                  <span className="text-muted">de {assignedCount} en la composición. El punto junto a cada nombre es su respuesta.</span>
                </div>
              )}
            </div>

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
                      onChange={(event) => channel.push({ kind: "renameRaid", id: raid.id, name: event.target.value })}
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

            {/* ---- Guardar la composición permanente ---- */}
            {canManage && (
              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted">
                  La composición de {EVENT_LABEL[eventType]} es permanente: no va atada a un día, se modifica cuando
                  la guild lo necesite y cada jugador ve su party en el inicio del panel. Lo que armas aquí queda en el
                  borrador compartido; «Guardar composición» lo publica.
                  {draft.confirmed.publishedAt
                    ? ` Última vez publicada: ${SAVED_FORMATTER.format(new Date(draft.confirmed.publishedAt))}${
                        draft.confirmed.publishedByName ? ` por ${draft.confirmed.publishedByName}` : ""
                      }.`
                    : " Todavía no se ha publicado ninguna."}
                </p>
                {live && (
                  <p
                    className={`text-xs font-semibold ${draft.unpublished ? "text-amber-400" : "text-emerald-400"}`}
                  >
                    {draft.unpublished
                      ? "El borrador tiene cambios sin publicar: los jugadores todavía ven la versión anterior."
                      : "Lo publicado coincide con el borrador."}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={notify}
                      onChange={(event) => setNotify(event.target.checked)}
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    Informar por Discord
                  </label>
                  {notify && (
                    <select
                      value={notifyChannel[eventType]}
                      onChange={(event) =>
                        setNotifyChannel((prev) => ({ ...prev, [eventType]: event.target.value }))
                      }
                      aria-label="Canal de Discord"
                      className="min-w-[220px] rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground"
                    >
                      <option value="" disabled>
                        Elige el canal…
                      </option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.category ? `${channel.category} / ${channel.label}` : channel.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={save}
                    disabled={isSaving}
                    className="btn-brand px-4 py-2 text-sm disabled:opacity-50 sm:ml-auto"
                  >
                    {isSaving ? "Guardando…" : "Guardar composición"}
                  </button>
                </div>
                {notify && (
                  <p className="text-xs text-muted">
                    Se publica el roster mencionando a [SD] Core. Si ya se había informado en ese canal, se edita el
                    mismo mensaje en vez de mandar otro.
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
