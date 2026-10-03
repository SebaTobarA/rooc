import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { loadCorePlayers, loadMonthEvents, loadMonthSummaries } from "@/lib/core-census/data";
import { SHEET_REQUIREMENTS, formatRequirementValue, requirementStatus } from "@/lib/core-census/requirements";
import {
  EVALUATION_START_MONTH,
  monthLabel,
  parseMonthKey,
  shiftMonthKey,
  type CensusTier,
} from "@/lib/core-census/tier";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { CensusTable, type CensusTableRow } from "@/components/core-census/census-table";
import { TIER_HINT, TierBadge } from "@/components/core-census/census-badges";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Evaluación de CORE",
};

// Máximo acordado de miembros con el rol [SD] Core.
const CORE_MEMBER_CAP = 78;
const BASE_PATH = "/admin/evaluacion-core";

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

const TIERS: CensusTier[] = ["S", "A", "B"];

export default async function CoreEvaluationPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const monthKey = parseMonthKey((await searchParams).mes);

  // Abrir el módulo es lo que pone las fichas al día con el rol de Discord:
  // crea las de quienes lo recibieron y marca como ex miembros a quienes lo
  // perdieron (ver syncCorePlayers).
  const { players, syncError } = await loadCorePlayers({ sync: true });
  const [events, summaries] = await Promise.all([loadMonthEvents(monthKey), loadMonthSummaries(monthKey)]);

  const rows: CensusTableRow[] = players.map((player) => ({
    discordId: player.discordId,
    displayName: player.displayName,
    username: player.username,
    avatarUrl: discordAvatarUrl(player.discordId, player.avatarHash, 32),
    characterName: player.characterName,
    job: player.job,
    inCore: player.inCore,
    requirements: SHEET_REQUIREMENTS.map((requirement) => ({
      value: formatRequirementValue(requirement, player.sheet),
      status: requirementStatus(requirement, player.sheet),
    })),
    summary: summaries.get(player.discordId) ?? null,
  }));

  const activeCount = players.filter((player) => player.inCore).length;
  const tierCounts = { S: 0, A: 0, B: 0 };
  for (const row of rows) {
    if (row.inCore && row.summary?.tier) tierCounts[row.summary.tier] += 1;
  }
  const reportedEvents = events.filter((event) => event.coreCensusAt).length;

  return (
    <div>
      {syncError && (
        <div className="mb-4">
          <BotErrorNotice message={`No se pudo actualizar contra Discord, se muestra lo último guardado. ${syncError}`} />
        </div>
      )}

      <p className="max-w-3xl text-sm text-muted">
        Hoja de vida de cada jugador que tiene o tuvo el rol <code className="text-accent">[SD] Core</code>:{" "}
        {activeCount} de {CORE_MEMBER_CAP} activo(s) y {players.length - activeCount} ex miembro(s). La ficha se crea
        sola al recibir el rol y se conserva si lo pierde. El equipo se revisa a mano cuando corresponda; después de
        cada evento solo se carga su reporte.
        {activeCount > CORE_MEMBER_CAP && (
          <span className="ml-1 text-rose-400">Hay más miembros Core que el máximo acordado.</span>
        )}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {monthKey > EVALUATION_START_MONTH ? (
            <Link
              href={`${BASE_PATH}?mes=${shiftMonthKey(monthKey, -1)}`}
              aria-label="Mes anterior"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:text-foreground"
            >
              <ChevronLeft size={16} />
            </Link>
          ) : (
            // La evaluación no tiene meses anteriores a su inicio.
            <span className="h-8 w-8" />
          )}
          <h2 className="min-w-[150px] text-center text-lg font-semibold text-foreground">{monthLabel(monthKey)}</h2>
          <Link
            href={`${BASE_PATH}?mes=${shiftMonthKey(monthKey, 1)}`}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:text-foreground"
          >
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          {TIERS.map((tier) => (
            <span key={tier} className="flex items-center gap-2" title={TIER_HINT[tier]}>
              <TierBadge tier={tier} />
              {tierCounts[tier]}
            </span>
          ))}
        </div>
      </div>

      <section className="mt-5 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-foreground">Reportes post evento</h3>
          <p className="text-xs text-muted">
            {reportedEvents} de {events.length} con reporte. Solo esos cuentan para la asistencia regular.
          </p>
        </div>

        {events.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No hay eventos creados para este mes desde el inicio de la evaluación (domingo 4 de octubre de 2026). Se
            crean desde{" "}
            <Link href="/panel/eventos/nueva-semana" className="text-accent hover:underline">
              Eventos → Semana de asistencia
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`${BASE_PATH}/evento/${event.id}`}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background-elevated p-3 hover:border-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {event.template.icon ? `${event.template.icon} ` : ""}
                      {EVENT_CATEGORY_LABEL[event.category]}
                    </span>
                    <span className="block text-xs text-muted">{EVENT_DATE_FORMATTER.format(event.startsAt)}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                      event.coreCensusAt
                        ? "border-emerald-500/40 text-emerald-400"
                        : "border-amber-500/40 text-amber-400"
                    }`}
                  >
                    {event.coreCensusAt ? "Reportado" : "Pendiente"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-5">
        <CensusTable
          rows={rows}
          basePath={BASE_PATH}
          requirementLabels={SHEET_REQUIREMENTS.map((requirement) => requirement.label)}
        />
      </div>

      <p className="mt-3 text-xs text-muted">
        Mínimos de equipo: {SHEET_REQUIREMENTS.map((requirement) => requirement.hint).join(" · ")}. En verde lo que
        cumple, en rojo lo que no, y «—» lo que todavía no se revisó. Toca un jugador para abrir su hoja de vida.
      </p>
    </div>
  );
}
