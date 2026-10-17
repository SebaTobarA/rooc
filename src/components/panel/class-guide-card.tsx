"use client";

import { useState } from "react";
import { Gem, GitBranch, Shield, Sparkles, type LucideIcon } from "lucide-react";
import type { JobWithSkills } from "@/lib/skill-tree";
import { GUIDE_SECTIONS, type GuideEntry, type GuideSectionKey } from "@/lib/class-guide";
import { SkillTreeCanvas } from "@/components/panel/build-pvp/skill-tree-canvas";

export interface GuideBuildView {
  id: string;
  name: string;
  description: string;
  allocations: Record<string, number>;
  sections: Record<GuideSectionKey, GuideEntry[]>;
}

const TIER_LABELS = ["1st Job", "2nd Job", "Trans. 2nd"];

// Ícono de cada sección, en el mismo orden que GUIDE_SECTIONS.
const SECTION_ICONS: Record<GuideSectionKey, LucideIcon> = {
  accessories: Gem,
  enchants: Sparkles,
  mounts: GitBranch,
  divineEquip: Shield,
};

/**
 * Guía de clase del jugador en el inicio del panel: las builds recomendadas
 * por la guild para su clase, una pestaña por tipo de build, cada una con su
 * árbol de skills y las secciones de la guía. Solo lectura: la editan los
 * admin en /panel/build-pvp.
 */
export function ClassGuideCard({
  className,
  chain,
  builds,
}: {
  className: string | null;
  chain: [JobWithSkills, JobWithSkills, JobWithSkills] | null;
  builds: GuideBuildView[];
}) {
  const [activeId, setActiveId] = useState(builds[0]?.id ?? null);
  const [activeTier, setActiveTier] = useState(0);
  const build = builds.find((candidate) => candidate.id === activeId) ?? builds[0] ?? null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Special Delivery / Guía de clase</p>
      <h2 className="mt-1 text-lg font-bold text-foreground">{className ?? "Tu clase"}</h2>
      <p className="text-xs text-muted">Builds recomendadas por la guild · Solo lectura</p>

      {!className ? (
        <p className="mt-4 rounded-[10px] border border-dashed border-border p-5 text-center text-sm text-muted">
          Elige tu clase en tu perfil para ver su guía.
        </p>
      ) : !build ? (
        <p className="mt-4 rounded-[10px] border border-dashed border-border p-5 text-center text-sm text-muted">
          Todavía no hay una guía publicada para {className}. Cuando los mentores la carguen, aparece aquí.
        </p>
      ) : (
        <>
          {builds.length > 1 && (
            <div className="mt-4 grid gap-1 rounded-[10px] border border-border bg-background-elevated p-1 sm:grid-flow-col sm:auto-cols-fr">
              {builds.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => {
                    setActiveId(candidate.id);
                    setActiveTier(0);
                  }}
                  className={`truncate rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    candidate.id === build.id ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
                  }`}
                >
                  {candidate.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 border-b border-border pb-4">
            <h3 className="font-semibold text-foreground">{build.name}</h3>
            <p className="text-xs text-muted">{build.description || "Ficha completa de la especialización seleccionada."}</p>
          </div>

          <div className="mt-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GitBranch className="h-4 w-4 text-accent" />
              1. Árbol de skills
            </p>
            {chain ? (
              <div className="mt-3 rounded-xl border border-border bg-background-elevated p-4">
                <div className="grid grid-cols-3 gap-2">
                  {chain.map((job, index) => {
                    const spent = job.skills.reduce((sum, skill) => sum + (build.allocations[skill.id] ?? 0), 0);
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => setActiveTier(index)}
                        className={`rounded-lg px-2 py-2 text-center text-xs transition-colors ${
                          activeTier === index ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
                        }`}
                      >
                        <span className="block font-semibold">{TIER_LABELS[index]}</span>
                        <span className="block text-[11px] opacity-80">
                          {job.name} · {spent}/40
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <SkillTreeCanvas skills={chain[activeTier].skills} levels={build.allocations} />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">El árbol de skills de esta clase todavía no está cargado.</p>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {GUIDE_SECTIONS.map((section, index) => {
              const Icon = SECTION_ICONS[section.key];
              const entries = build.sections[section.key];
              return (
                <div key={section.key} className="rounded-xl border border-border bg-background-elevated p-4">
                  <Icon className="h-4 w-4 text-accent" />
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {index + 2}. {section.label}
                  </p>
                  {entries.length === 0 ? (
                    <p className="mt-1 text-xs text-muted">Sin recomendaciones todavía.</p>
                  ) : (
                    <ol className="mt-2 flex flex-col gap-1.5">
                      {entries.map((entry, entryIndex) => (
                        <li key={entryIndex} className="text-sm">
                          <span className="mr-1.5 text-xs text-muted">{entryIndex + 1}.</span>
                          <span className="font-medium text-foreground">{entry.name}</span>
                          {entry.detail && <span className="block pl-5 text-xs text-muted">{entry.detail}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
