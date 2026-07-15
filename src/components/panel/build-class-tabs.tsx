"use client";

import { useState } from "react";

const TABS = [
  "Resumen",
  "Skills",
  "Equipamiento y Accesorios",
  "Cards",
  "Enchants",
  "Medals",
  "Pets",
  "Mounts",
] as const;

export function BuildClassTabs() {
  const [active, setActive] = useState<(typeof TABS)[number]>(TABS[0]);

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold text-foreground">Build Class PVP</h2>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-border pb-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`rounded-[10px] px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
              active === tab
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center">
        <p className="font-semibold text-foreground">En construcción</p>
        <p className="mt-1 text-sm text-muted">
          La pestaña &quot;{active}&quot; todavía no tiene contenido — próximamente vas a poder
          armar y compartir acá tu build de PVP.
        </p>
      </div>
    </section>
  );
}
