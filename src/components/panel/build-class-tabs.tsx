"use client";

import { useState } from "react";
import Link from "next/link";
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
          <div className="mt-5">
            <p className="text-xs text-muted">
              Build enviada por la guild para <span className="font-semibold text-accent">{className}</span>:{" "}
              <span className="font-semibold text-foreground">{build.name}</span> —{" "}
              <Link href={`/panel/build-pvp?build=${build.id}`} className="text-accent hover:underline">
                editar en el simulador
              </Link>
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {chain.map((tierJob, i) => (
                <div key={tierJob.id} className="rounded-lg border border-border bg-background-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{TIER_LABELS[i]}</p>
                  <h3 className="font-semibold text-foreground">{tierJob.name}</h3>
                  <div className="mt-3">
                    <SkillTreeCanvas
                      skills={tierJob.skills}
                      levels={build.allocations as Record<string, number>}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
