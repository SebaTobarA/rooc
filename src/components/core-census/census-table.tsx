"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { CensusTier, MemberMonthSummary } from "@/lib/core-census/tier";
import type { RequirementStatus } from "@/lib/core-census/requirements";
import { REQUIREMENT_STATUS_CLASS, TierBadge } from "./census-badges";

export interface CensusTableRow {
  discordId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  characterName: string;
  job: string | null;
  /** Job que quiere jugar, si dijo que no está cómod@ con el actual; "" si quiere cambiar sin definir cuál. */
  desiredJob: string | null;
  /** false = ex miembro: ya no tiene el rol, se conserva su hoja de vida. */
  inCore: boolean;
  /** Una celda por requisito, en el orden de SHEET_REQUIREMENTS. */
  requirements: { value: string; status: RequirementStatus }[];
  summary: MemberMonthSummary | null;
}

type TierFilter = "ALL" | CensusTier | "NONE";
type StatusFilter = "ACTIVE" | "FORMER" | "ALL";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ACTIVE", label: "Activos" },
  { value: "FORMER", label: "Ex miembros" },
  { value: "ALL", label: "Todos" },
];

const TIER_FILTERS: { value: TierFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "S", label: "Tier S" },
  { value: "A", label: "Tier A" },
  { value: "B", label: "Tier B" },
  { value: "NONE", label: "Sin datos" },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .trim();
}

const POINTS_FORMATTER = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

interface CensusTableProps {
  rows: CensusTableRow[];
  requirementLabels: string[];
  /** Ruta del módulo, para enlazar a la hoja de vida de cada jugador. */
  basePath: string;
}

export function CensusTable({ rows, requirementLabels, basePath }: CensusTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [tierFilter, setTierFilter] = useState<TierFilter>("ALL");

  const visibleRows = useMemo(() => {
    const query = normalize(search);
    return rows.filter((row) => {
      if (statusFilter !== "ALL" && row.inCore !== (statusFilter === "ACTIVE")) return false;
      const tier = row.summary?.tier ?? null;
      if (tierFilter === "NONE" ? tier !== null : tierFilter !== "ALL" && tier !== tierFilter) return false;
      if (!query) return true;
      return [row.displayName, row.username, row.characterName, row.job ?? ""].some((text) =>
        normalize(text).includes(query)
      );
    });
  }, [rows, search, tierFilter, statusFilter]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, personaje o job…"
            className="w-full rounded-[10px] border border-border bg-surface py-2 pl-8 pr-3 text-sm text-foreground"
          />
        </div>
        <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          Estado
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-[10px] border border-border bg-surface px-2 py-2 text-sm normal-case text-foreground"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1">
          {TIER_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTierFilter(filter.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                tierFilter === filter.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Jugador</th>
              {requirementLabels.map((label) => (
                <th key={label} className="px-3 py-2 font-medium">
                  {label}
                </th>
              ))}
              <th className="px-3 py-2 font-medium" title="Eventos a los que asistió (juego + Discord) / eventos con reporte">
                Asistencia
              </th>
              <th className="px-3 py-2 font-medium" title="Eventos en los que estuvo en la voz de Discord">
                Discord
              </th>
              <th className="px-3 py-2 font-medium" title="Faltas sin justificar (las justificadas van entre paréntesis)">
                Faltas
              </th>
              <th className="px-3 py-2 font-medium" title="Promedio de puntos por evento jugado">
                Puntos
              </th>
              <th className="px-3 py-2 font-medium" title="K / D / A del mes y ratio (K+A)/D">
                KDA
              </th>
              <th className="px-3 py-2 font-medium">Asistencia regular</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleRows.map((row) => {
              const summary = row.summary;
              return (
                <tr key={row.discordId} className="hover:bg-surface/60">
                  <td className="px-3 py-2">
                    <Link
                      href={`${basePath}/jugador/${row.discordId}`}
                      className="flex items-center gap-2 hover:text-accent"
                    >
                      {row.avatarUrl ? (
                        <img src={row.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background-elevated text-xs font-semibold text-muted">
                          {row.displayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span>
                        <span className="block font-semibold text-foreground">{row.characterName}</span>
                        <span className="block text-xs text-muted">
                          @{row.username}
                          {row.job ? ` · ${row.job}` : ""}
                        </span>
                        {row.desiredJob !== null && (
                          <span className="block text-xs text-amber-400">
                            Quiere cambiar de job{row.desiredJob ? `: ${row.desiredJob}` : ""}
                          </span>
                        )}
                        {!row.inCore && <span className="block text-xs text-rose-400">Ex miembro</span>}
                      </span>
                    </Link>
                  </td>
                  {row.requirements.map((cell, index) => (
                    <td key={index} className={`px-3 py-2 ${REQUIREMENT_STATUS_CLASS[cell.status]}`}>
                      {cell.value}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-foreground">
                    {summary ? `${summary.attended}/${summary.events}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {summary ? `${summary.inDiscord}/${summary.events}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {summary ? summary.faults : "—"}
                    {summary && summary.justified > 0 && (
                      <span className="ml-1 text-xs text-sky-400" title="Faltas justificadas">
                        (+{summary.justified} just.)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {summary?.avgPoints != null ? POINTS_FORMATTER.format(summary.avgPoints) : "—"}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {summary?.kda != null ? (
                      <>
                        {summary.kills}/{summary.deaths}/{summary.assists}
                        <span className="ml-1 text-xs text-muted">({summary.kda.toFixed(1)})</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <TierBadge tier={summary?.tier ?? null} />
                  </td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={requirementLabels.length + 7} className="px-3 py-6 text-center text-sm text-muted">
                  {rows.length === 0 ? "Nadie tiene el rol [SD] Core todavía." : "Ningún jugador coincide con el filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
