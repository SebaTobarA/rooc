"use client";

import { useState } from "react";

export interface PerformancePoint {
  id: string;
  /** Fecha corta para el eje, ej. "04/10". */
  label: string;
  value: number;
  /** Segunda línea del tooltip, ej. "K/D/A 5/2/7 · Lord Knight". */
  detail: string;
}

const WIDTH = 560;
const HEIGHT = 190;
const PAD = { top: 12, right: 8, bottom: 26, left: 44 };
const MAX_BAR_WIDTH = 28;
const NUMBER_FORMATTER = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

/** Redondea hacia arriba a un tope "limpio" (1, 2 o 5 por potencia de 10) para el eje. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((candidate) => candidate * power >= value) ?? 10;
  return step * power;
}

/** Barra con la punta redondeada y la base recta, apoyada en la línea de base. */
function barPath(x: number, y: number, width: number, height: number): string {
  const radius = Math.min(4, width / 2, height);
  return `M${x},${y + height}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + width - radius}Q${x + width},${y} ${x + width},${y + radius}V${y + height}Z`;
}

/**
 * Puntos por evento a lo largo del tiempo, una sola serie (un tipo de evento
 * por gráfico: Guild League y Emperium Overrun no comparten escala). El
 * detalle fila por fila está en la tabla "Historial de eventos" de la ficha.
 */
export function PerformanceChart({ title, points }: { title: string; points: PerformancePoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-background-elevated p-4">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="mt-6 pb-6 text-center text-sm text-muted">Todavía sin eventos jugados con puntos cargados.</p>
      </div>
    );
  }

  const max = niceMax(Math.max(...points.map((point) => point.value)));
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const band = plotWidth / points.length;
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(4, band - 2));
  const ticks = [0, max / 2, max];
  // Con muchos eventos las fechas se pisan: se muestra una de cada N.
  const labelEvery = Math.ceil(points.length / 10);
  const active = hovered !== null ? points[hovered] : null;

  return (
    <div className="rounded-[10px] border border-border bg-background-elevated p-4">
      <div className="flex min-h-[40px] flex-wrap items-baseline justify-between gap-x-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted" aria-live="polite">
          {active ? (
            <>
              <span className="text-foreground">
                {active.label}: {NUMBER_FORMATTER.format(active.value)} pts
              </span>
              {active.detail ? ` · ${active.detail}` : ""}
            </>
          ) : (
            "Pasa el cursor por una barra para ver el detalle"
          )}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${title}: puntos por evento. El detalle está en la tabla Historial de eventos.`}
        className="mt-2 w-full"
        onMouseLeave={() => setHovered(null)}
      >
        {ticks.map((tick) => {
          const y = PAD.top + plotHeight - (tick / max) * plotHeight;
          return (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="var(--muted)">
                {NUMBER_FORMATTER.format(tick)}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const height = Math.max(1, (point.value / max) * plotHeight);
          const x = PAD.left + band * index + (band - barWidth) / 2;
          const y = PAD.top + plotHeight - height;
          return (
            <g key={point.id}>
              <path
                d={barPath(x, y, barWidth, height)}
                fill="var(--accent)"
                opacity={hovered === null || hovered === index ? 1 : 0.45}
              />
              {index % labelEvery === 0 && (
                <text x={x + barWidth / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={10} fill="var(--muted)">
                  {point.label}
                </text>
              )}
              {/* Zona de hover de toda la columna: más grande que la barra. */}
              <rect
                x={PAD.left + band * index}
                y={PAD.top}
                width={band}
                height={plotHeight + PAD.bottom}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                aria-label={`${point.label}: ${NUMBER_FORMATTER.format(point.value)} puntos. ${point.detail}`}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
