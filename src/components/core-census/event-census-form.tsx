"use client";

import { useMemo, useState, useTransition } from "react";
import { Mic, Search } from "lucide-react";
import { saveEventCensus, takeVoiceAttendance, type CensusRowInput } from "@/lib/actions/core-census";
import { SURVEY_TONE_CLASS, type SurveyTone } from "@/lib/core-census/survey";

export interface EventCensusRow extends CensusRowInput {
  characterName: string;
  job: string | null;
  /** Qué respondió en la encuesta de asistencia de Discord (ver surveyAnswer). */
  survey: { label: string; tone: SurveyTone };
}

type StatField = "points" | "kills" | "deaths" | "assists";

const STAT_COLUMNS: { field: StatField; label: string }[] = [
  { field: "points", label: "Puntos" },
  { field: "kills", label: "K" },
  { field: "deaths", label: "D" },
  { field: "assists", label: "A" },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .trim();
}

interface EventCensusFormProps {
  eventId: string;
  initialRows: EventCensusRow[];
  /** Nombres de los canales de voz que revisa Boo, para el texto de ayuda. */
  voiceChannelNames: string[];
}

export function EventCensusForm({ eventId, initialRows, voiceChannelNames }: EventCensusFormProps) {
  const [rows, setRows] = useState<EventCensusRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isTakingVoice, startTakingVoice] = useTransition();

  function patchRow(discordId: string, patch: Partial<EventCensusRow>) {
    setRows((prev) => prev.map((row) => (row.discordId === discordId ? { ...row, ...patch } : row)));
    setDirty(true);
  }

  function handleStat(discordId: string, field: StatField, value: string) {
    const parsed = value.trim() === "" ? null : Math.max(0, Math.floor(Number(value)));
    patchRow(discordId, { [field]: parsed !== null && Number.isNaN(parsed) ? null : parsed });
  }

  function handleTakeVoice() {
    setMessage(null);
    startTakingVoice(async () => {
      const result = await takeVoiceAttendance(eventId);
      if (result.error || !result.presentIds) {
        setMessage({ kind: "error", text: result.error ?? "No se pudo tomar la lista de voz." });
        return;
      }
      const present = new Set(result.presentIds);
      setRows((prev) => prev.map((row) => (present.has(row.discordId) ? { ...row, inDiscord: true } : row)));
      setMessage({
        kind: "ok",
        text: `Boo revisó a ${result.checked} miembro(s): ${result.presentIds.length} en voz ahora mismo. Ya quedaron marcados en Discord.`,
      });
    });
  }

  function handleSave() {
    setMessage(null);
    startSaving(async () => {
      const payload: CensusRowInput[] = rows.map((row) => ({
        discordId: row.discordId,
        displayName: row.displayName,
        inGame: row.inGame,
        inDiscord: row.inDiscord,
        points: row.points,
        kills: row.kills,
        deaths: row.deaths,
        assists: row.assists,
        justified: row.justified,
        note: row.note,
      }));
      const result = await saveEventCensus(eventId, payload);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setDirty(false);
      setMessage({
        kind: "ok",
        text: "Reporte guardado. Ya cuenta para la asistencia regular del mes y quedó en la hoja de vida de cada jugador.",
      });
    });
  }

  const visibleRows = useMemo(() => {
    const query = normalize(search);
    if (!query) return rows;
    return rows.filter((row) =>
      [row.characterName, row.displayName, row.job ?? ""].some((text) => normalize(text).includes(query))
    );
  }, [rows, search]);

  const inGameCount = rows.filter((row) => row.inGame).length;
  const inDiscordCount = rows.filter((row) => row.inDiscord).length;
  const faultCount = rows.filter((row) => !(row.inGame && row.inDiscord) && !row.justified).length;
  const busy = isSaving || isTakingVoice;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleTakeVoice}
          disabled={busy}
          title={`Revisa quiénes están ahora en: ${voiceChannelNames.join(", ")}`}
          className="flex items-center gap-2 rounded-[10px] border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
        >
          <Mic size={15} />
          {isTakingVoice ? "Boo está revisando la voz…" : "Tomar lista de voz con Boo"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRows((prev) => prev.map((row) => ({ ...row, inGame: true })));
            setDirty(true);
          }}
          disabled={busy}
          className="rounded-[10px] border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
        >
          Marcar que todos jugaron
        </button>
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar personaje…"
            className="w-full rounded-[10px] border border-border bg-surface py-2 pl-8 pr-3 text-sm text-foreground"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Boo revisa a cada miembro Core en {voiceChannelNames.join(" y ")} en el momento en que tocas el botón: úsalo
        durante el evento (puedes repetirlo, solo suma gente). La encuesta se lee sola desde Discord; el resto se marca a
        mano al terminar.
      </p>

      {message && (
        <p
          role="status"
          className={`mt-3 rounded-[10px] border px-3 py-2 text-sm ${
            message.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/40 bg-rose-500/10 text-rose-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="whitespace-nowrap bg-surface text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Personaje</th>
              <th className="px-3 py-2 text-center font-medium" title="Estuvo conectado en la voz del evento">
                Discord
              </th>
              <th className="px-3 py-2 font-medium" title="Respuesta a la encuesta de asistencia de Discord">
                Encuesta
              </th>
              <th className="px-3 py-2 text-center font-medium" title="Participó del evento en el juego">
                Jugó
              </th>
              {STAT_COLUMNS.map((column) => (
                <th key={column.field} className="px-2 py-2 font-medium">
                  {column.label}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium" title="Falta avisada con anticipación: no baja el tier">
                Justificada
              </th>
              <th className="px-3 py-2 font-medium">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleRows.map((row) => {
              const attended = row.inGame && row.inDiscord;
              return (
                <tr key={row.discordId} className="hover:bg-surface/60">
                  <td className="px-3 py-2">
                    <span className="block font-semibold text-foreground">{row.characterName}</span>
                    <span className="block text-xs text-muted">
                      {row.displayName !== row.characterName ? `${row.displayName} · ` : ""}
                      {row.job ?? "Sin job"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.inDiscord}
                      onChange={(e) => patchRow(row.discordId, { inDiscord: e.target.checked })}
                      aria-label={`${row.characterName} estuvo en Discord`}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 text-xs ${SURVEY_TONE_CLASS[row.survey.tone]}`}>
                    {row.survey.label}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.inGame}
                      onChange={(e) => patchRow(row.discordId, { inGame: e.target.checked })}
                      aria-label={`${row.characterName} jugó el evento`}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </td>
                  {STAT_COLUMNS.map((column) => (
                    <td key={column.field} className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row[column.field] ?? ""}
                        disabled={!row.inGame}
                        onChange={(e) => handleStat(row.discordId, column.field, e.target.value)}
                        aria-label={`${column.label} de ${row.characterName}`}
                        className={`rounded-md border border-border bg-background-elevated px-2 py-1 text-sm text-foreground disabled:opacity-40 ${
                          column.field === "points" ? "w-24" : "w-16"
                        }`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.justified && !attended}
                      disabled={attended}
                      onChange={(e) => patchRow(row.discordId, { justified: e.target.checked })}
                      aria-label={`Falta justificada de ${row.characterName}`}
                      className="h-4 w-4 accent-[var(--accent)] disabled:opacity-40"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.note}
                      maxLength={300}
                      onChange={(e) => patchRow(row.discordId, { note: e.target.value })}
                      placeholder={row.justified && !attended ? "Motivo (obligatorio)" : ""}
                      aria-label={`Nota de ${row.characterName}`}
                      className={`w-full min-w-[180px] rounded-md border bg-background-elevated px-2 py-1 text-sm text-foreground ${
                        row.justified && !attended && !row.note.trim() ? "border-rose-500/60" : "border-border"
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-sm text-muted">
                  Ningún jugador coincide con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background-elevated px-4 py-3">
        <p className="text-sm text-muted">
          {inDiscordCount} en Discord · {inGameCount} jugaron · {faultCount} falta(s) de {rows.length}
          {dirty && <span className="ml-2 text-amber-400">Cambios sin guardar</span>}
        </p>
        <button type="button" onClick={handleSave} disabled={busy} className="btn-brand px-4 py-2 text-sm disabled:opacity-50">
          {isSaving ? "Guardando…" : "Guardar reporte"}
        </button>
      </div>
    </div>
  );
}
