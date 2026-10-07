import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { EVENT_CATEGORIES, bestJobs, jobStats, type PerformanceRecord } from "@/lib/core-census/performance";
import { summarizeMonth } from "@/lib/core-census/tier";
import { PerformanceChart, type PerformancePoint } from "./performance-chart";

const POINTS_FORMATTER = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Santiago",
});

/**
 * Sección "Rendimiento" de un jugador: puntos por evento (un gráfico por tipo
 * de evento), con qué job rinde mejor y cuántas veces jugó cada uno. La usan
 * la hoja de vida que ven los oficiales y "Mi personaje" del propio jugador.
 * `records` viene del más nuevo al más viejo.
 */
export function PlayerPerformance({ records }: { records: PerformanceRecord[] }) {
  const stats = jobStats(records);
  const best = bestJobs(stats);
  const maxJobTotal = Math.max(1, ...stats.map((row) => row.total));
  const eventsWithParty = records.filter((record) => record.partyName).length;

  const charts = EVENT_CATEGORIES.map((category) => {
    const ofCategory = records.filter((record) => record.event.category === category);
    const points: PerformancePoint[] = ofCategory
      .filter((record) => record.inGame && record.points !== null)
      .map((record) => ({
        id: record.id,
        label: SHORT_DATE_FORMATTER.format(record.event.startsAt),
        value: record.points ?? 0,
        detail: [
          record.kills !== null || record.deaths !== null || record.assists !== null
            ? `K/D/A ${record.kills ?? 0}/${record.deaths ?? 0}/${record.assists ?? 0}`
            : "",
          record.jobName ?? "",
          record.partyName ?? "",
        ]
          .filter(Boolean)
          .join(" · "),
      }))
      .reverse();
    return { category, summary: summarizeMonth(ofCategory), points };
  });

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map(({ category, summary, points }) => (
          <div key={category}>
            <PerformanceChart title={`Puntos por evento · ${EVENT_CATEGORY_LABEL[category]}`} points={points} />
            <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Asistió", value: summary.events > 0 ? `${summary.attended}/${summary.events}` : "—" },
                { label: "Jugó", value: summary.events > 0 ? String(summary.inGame) : "—" },
                {
                  label: "Pts prom.",
                  value: summary.avgPoints != null ? POINTS_FORMATTER.format(summary.avgPoints) : "—",
                },
                { label: "KDA", value: summary.kda != null ? summary.kda.toFixed(1) : "—" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[10px] border border-border bg-background-elevated p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-muted">{stat.label}</dt>
                  <dd className="text-sm font-semibold text-foreground">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Jobs jugados</h3>
          {best.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
              {best.map((entry) => (
                <li key={entry.category}>
                  Mejor en {EVENT_CATEGORY_LABEL[entry.category]}:{" "}
                  <span className="font-semibold text-accent">{entry.job}</span>, {POINTS_FORMATTER.format(entry.avgPoints)}{" "}
                  pts de promedio en {entry.played} evento(s).
                </li>
              ))}
            </ul>
          )}
          {stats.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Todavía sin datos: el job de cada evento se registra al guardar su reporte.
            </p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 font-medium">Job</th>
                  <th className="py-1 font-medium">Veces</th>
                  {EVENT_CATEGORIES.map((category) => (
                    <th key={category} className="px-2 py-1 text-right font-medium">
                      {EVENT_CATEGORY_LABEL[category]} (prom.)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.map((row) => (
                  <tr key={row.job}>
                    <td className="py-1.5 pr-3 text-foreground">{row.job}</td>
                    <td className="w-1/3 py-1.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 rounded-r-[4px] bg-accent"
                          style={{ width: `${(row.total / maxJobTotal) * 100}%`, minWidth: 4 }}
                        />
                        <span className="text-xs text-muted">{row.total}</span>
                      </span>
                    </td>
                    {EVENT_CATEGORIES.map((category) => {
                      const { played, avgPoints } = row.byCategory[category];
                      return (
                        <td key={category} className="px-2 py-1.5 text-right text-muted">
                          {played === 0
                            ? "—"
                            : `${played} · ${avgPoints != null ? `${POINTS_FORMATTER.format(avgPoints)} pts` : "sin pts"}`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Rendimiento en party</h3>
          <div className="mt-2 rounded-[10px] border border-dashed border-border p-4 text-center">
            <p className="font-semibold text-foreground">En construcción</p>
            <p className="mt-1 text-sm text-muted">
              Aquí se va a comparar el rendimiento según la party y los compañeros asignados en Guild League y Emperium
              Overrun. Los datos ya se están guardando: cada reporte toma la party del Party Builder de ese evento.
              Hasta ahora, {eventsWithParty} evento(s) con party registrada.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
