"use client";

import { useMemo, useState, useTransition } from "react";
import type { JobWithSkills } from "@/lib/skill-tree";
import { POINTS_PER_TIER } from "@/lib/skill-tree";
import { SkillTreeCanvas } from "@/components/panel/build-pvp/skill-tree-canvas";
import { saveBuild } from "@/lib/actions/build-history";

const TIER_LABELS = ["1st Job", "2nd Job", "Trans. 2nd"];
const TOTAL_POINTS = POINTS_PER_TIER * 3;

export function SkillPlanner({
  chain,
  initialLevels,
  loadedBuildName,
}: {
  chain: [JobWithSkills, JobWithSkills, JobWithSkills];
  initialLevels?: Record<string, number>;
  loadedBuildName?: string;
}) {
  const [levels, setLevels] = useState<Record<string, number>>(initialLevels ?? {});
  const [activeTier, setActiveTier] = useState(0);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [savingOpen, setSavingOpen] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [isSaving, startSaving] = useTransition();

  const skillById = useMemo(() => {
    const map = new Map<string, JobWithSkills["skills"][number]>();
    for (const job of chain) for (const skill of job.skills) map.set(skill.id, skill);
    return map;
  }, [chain]);

  const tierIndexBySkillId = useMemo(() => {
    const map = new Map<string, number>();
    chain.forEach((job, i) => job.skills.forEach((skill) => map.set(skill.id, i)));
    return map;
  }, [chain]);

  function spentInTier(tierIndex: number): number {
    return chain[tierIndex].skills.reduce((sum, skill) => sum + (levels[skill.id] ?? 0), 0);
  }

  // 40 es el mínimo para desbloquear el tier siguiente, no un tope — un
  // tier puede terminar con más de 40 (ver Crusader en el ejemplo de
  // Sebaa: 49/40). Solo Trans. 2nd puede quedar por debajo de 40, porque
  // no desbloquea nada después. El único tope real es el total del build.
  function isTierUnlocked(tierIndex: number): boolean {
    for (let i = 0; i < tierIndex; i++) {
      if (spentInTier(i) < POINTS_PER_TIER) return false;
    }
    return true;
  }

  const totalSpent = chain.reduce((sum, _job, i) => sum + spentInTier(i), 0);
  const pointsRemaining = TOTAL_POINTS - totalSpent;

  function canIncrement(skillId: string): boolean {
    const skill = skillById.get(skillId);
    const tierIndex = tierIndexBySkillId.get(skillId);
    if (!skill || tierIndex === undefined) return false;
    if (!isTierUnlocked(tierIndex)) return false;
    if (totalSpent >= TOTAL_POINTS) return false;
    const level = levels[skillId] ?? 0;
    if (level >= skill.maxLevel) return false;
    return skill.prerequisites.every((p) => (levels[p.requiresSkillId] ?? 0) >= p.requiredLevel);
  }

  // La edición siempre es completa: bajar un punto nunca se bloquea por
  // prerequisitos de otras skills ni por dejar un tier posterior "huérfano".
  // Es la única forma de poder corregir un error de carga sin quedar
  // trabado — el estado intermedio puede ser temporalmente inválido, pero
  // el jugador lo termina de acomodar subiendo puntos de nuevo.
  function canDecrement(skillId: string): boolean {
    const level = levels[skillId] ?? 0;
    return level > 0;
  }

  function increment(skillId: string) {
    if (!canIncrement(skillId)) return;
    setLevels((prev) => ({ ...prev, [skillId]: (prev[skillId] ?? 0) + 1 }));
  }

  function decrement(skillId: string) {
    if (!canDecrement(skillId)) return;
    setLevels((prev) => ({ ...prev, [skillId]: (prev[skillId] ?? 0) - 1 }));
  }

  function reset() {
    setLevels({});
    setActiveTier(0);
    setSelectedSkillId(null);
    setSavingOpen(false);
    setBuildName("");
    setSaveState("idle");
  }

  function handleSave() {
    if (!buildName.trim()) return;
    startSaving(async () => {
      try {
        await saveBuild(chain[2].id, buildName.trim(), levels);
        setSaveState("saved");
        setSavingOpen(false);
        setBuildName("");
      } catch {
        setSaveState("error");
      }
    });
  }

  const tierJob = chain[activeTier];
  const unlocked = isTierUnlocked(activeTier);
  const selectedSkill = selectedSkillId ? skillById.get(selectedSkillId) : null;
  const selectedLevel = selectedSkillId ? levels[selectedSkillId] ?? 0 : 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {/* --- Tarjeta de personaje --- */}
      <div className="flex w-full shrink-0 flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 sm:w-56">
        <span className="h-20 w-20 overflow-hidden rounded-full border-2 border-focus bg-background-elevated">
          {tierJob.portraitUrl ?? tierJob.iconUrl ? (
            <img
              src={tierJob.portraitUrl ?? tierJob.iconUrl ?? ""}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </span>
        <p className="text-center font-semibold text-foreground">{tierJob.name}</p>

        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border border-border">
          <span className="text-lg font-bold text-foreground">
            {spentInTier(activeTier)}/{POINTS_PER_TIER}
          </span>
          <span className="text-[9px] uppercase tracking-wide text-muted">Puntos</span>
        </div>

        <p className="text-xs text-muted">
          Disponibles: <span className="font-semibold text-foreground">{pointsRemaining}</span>
        </p>

        <button
          type="button"
          onClick={reset}
          className="w-full rounded-[10px] border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
        >
          Reiniciar
        </button>
      </div>

      {/* --- Árbol --- */}
      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        {loadedBuildName && (
          <p className="mb-3 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
            Viendo la build <span className="font-semibold">&quot;{loadedBuildName}&quot;</span>. Puedes
            seguir ajustándola y guardarla con otro nombre.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {chain.map((job, i) => {
            const tierUnlocked = isTierUnlocked(i);
            const active = activeTier === i;
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => setActiveTier(i)}
                className={`flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "bg-background-elevated text-muted hover:text-foreground"
                }`}
              >
                {!tierUnlocked && <span aria-hidden="true">🔒</span>}
                {TIER_LABELS[i]} {spentInTier(i)}/{POINTS_PER_TIER}
              </button>
            );
          })}
        </div>

        {!unlocked && (
          <p className="mt-3 rounded-md border border-border bg-background-elevated px-3 py-2 text-xs text-muted">
            Gasta los {POINTS_PER_TIER} puntos del tier anterior para desbloquear este.
          </p>
        )}

        <div className={`mt-4 ${unlocked ? "" : "opacity-50"}`}>
          <SkillTreeCanvas
            skills={tierJob.skills}
            levels={levels}
            onIncrement={increment}
            onDecrement={decrement}
            canIncrement={canIncrement}
            canDecrement={canDecrement}
            selectedSkillId={selectedSkillId}
            onSelect={setSelectedSkillId}
            disabled={!unlocked}
          />
        </div>

        {selectedSkill && (
          <div className="mt-4 rounded-lg border border-border bg-background-elevated p-3 text-sm">
            <p className="font-semibold text-foreground">
              {selectedSkill.name} — Nivel {selectedLevel}/{selectedSkill.maxLevel}
            </p>
            <p className="mt-1 text-muted">
              {selectedLevel > 0
                ? selectedSkill.levelDescriptions[selectedLevel - 1] || "Sin descripción cargada para este nivel."
                : selectedSkill.levelDescriptions[0] || "Todavía no invertiste puntos en esta habilidad."}
            </p>
          </div>
        )}

        {/* --- Guardar build --- */}
        <div className="mt-4 border-t border-border pt-4">
          {saveState === "saved" && (
            <p className="mb-3 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
              Build guardada. Un oficial la revisa y la envía para que la vean los jugadores de esta clase.
            </p>
          )}
          {saveState === "error" && (
            <p className="mb-3 rounded-md border border-border bg-background-elevated px-3 py-2 text-xs text-muted">
              No se pudo guardar la build. Intenta de nuevo.
            </p>
          )}

          {savingOpen ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                autoFocus
                type="text"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                placeholder="Nombre de la build, ej: PVP full ofensivo"
                className="flex-1 rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !buildName.trim()}
                  className="btn-brand px-4 py-2 text-sm disabled:opacity-50"
                >
                  {isSaving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setSavingOpen(false)}
                  className="rounded-[10px] border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={totalSpent === 0}
              onClick={() => {
                setSavingOpen(true);
                setSaveState("idle");
              }}
              className="rounded-[10px] border border-accent/40 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ¿Quieres guardar esta build?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
