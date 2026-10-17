import { ExternalLink } from "lucide-react";

export const metadata = {
  title: "Planificador de ligas",
};

/**
 * Planificador de ligas: rooc-tactics (modules/rooc-tactics), la app de mapas
 * y estrategias para Guild League y Vigrid. Se compila aparte a
 * public/tacticas con `npm run build:tactics` y se muestra acá dentro del
 * panel; también se puede abrir sola en /tacticas.
 */
export default function LeaguePlannerPage() {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Mapas de Guild League y Vigrid para planificar la estrategia de cada liga.
        </p>
        <a
          href="/tacticas"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-[10px] border border-accent/50 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir en pantalla completa
        </a>
      </div>
      <iframe
        src="/tacticas/index.html"
        title="Planificador de ligas"
        className="h-[calc(100vh-13rem)] min-h-[560px] w-full rounded-xl border border-border bg-[#020617]"
      />
    </div>
  );
}
