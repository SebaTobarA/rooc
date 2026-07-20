"use client";

import { useState } from "react";
import type { SavedBuild } from "@prisma/client";
import type { JobWithSkills } from "@/lib/skill-tree";
import { SkillTreeCanvas } from "@/components/panel/build-pvp/skill-tree-canvas";

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

const TIER_LABELS = ["1st Job", "2nd Job", "Trans. 2nd"];

function BuildSkillsView({
  className,
  chain,
  build,
}: {
  className: string | null;
  chain: [JobWithSkills, JobWithSkills, JobWithSkills];
  build: SavedBuild;
}) {
  const [activeTier, setActiveTier] = useState(0);
  const allocations = build.allocations as Record<string, number>;

  function spentInTier(tierIndex: number): number {
    return chain[tierIndex].skills.reduce((sum, skill) => sum + (allocations[skill.id] ?? 0), 0);
  }

  const tierJob = chain[activeTier];

  return (
    <div className="mt-5">
      {/* Solo muestra el resultado — editar una build enviada se hace desde
          el panel de administración, no acá. */}
      <p className="text-xs text-muted">
        Build enviada por la guild para <span className="font-semibold text-accent">{className}</span>:{" "}
        <span className="font-semibold text-foreground">{build.name}</span>
      </p>

      <div className="mt-4 rounded-xl border border-border bg-background-elevated p-4">
        <div className="flex flex-wrap gap-2">
          {chain.map((job, i) => (
            <button
              key={job.id}
              type="button"
              onClick={() => setActiveTier(i)}
              className={`rounded-[10px] px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeTier === i
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              {TIER_LABELS[i]} {spentInTier(i)}/40
            </button>
          ))}
        </div>

        <h3 className="mt-4 font-semibold text-foreground">{tierJob.name}</h3>
        <div className="mt-3">
          <SkillTreeCanvas skills={tierJob.skills} levels={allocations} />
        </div>
      </div>
    </div>
  );
}

export function BuildClassTabs({
  className,
  chain,
  build,
}: {
  className: string | null;
  chain: [JobWithSkills, JobWithSkills, JobWithSkills] | null;
  build: SavedBuild | null;
}) {
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

      {active === "Skills" ? (
        chain && build ? (
          <BuildSkillsView className={className} chain={chain} build={build} />
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="font-semibold text-foreground">Todavía no hay una build enviada para tu clase</p>
            <p className="mt-1 text-sm text-muted">
              Cuando un oficial envíe una build de PVP para tu clase desde el panel de administración,
              va a aparecer acá con el detalle de cada skill.
            </p>
          </div>
        )
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-semibold text-foreground">En construcción</p>
          <p className="mt-1 text-sm text-muted">
            La pestaña &quot;{active}&quot; todavía no tiene contenido — próximamente vas a poder
            armar y compartir acá tu build de PVP.
          </p>
        </div>
      )}
    </section>
  );
}
