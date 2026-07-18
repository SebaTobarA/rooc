"use client";

export type CanvasSkill = {
  id: string;
  name: string;
  iconUrl: string | null;
  maxLevel: number;
  col: number;
  row: number;
  prerequisites: { requiresSkillId: string; requiredLevel: number }[];
};

const CELL_W = 104;
const CELL_H = 96;
const NODE_SIZE = 60;

/**
 * Grilla del árbol de habilidades: posiciona cada skill en (col, row) y
 * dibuja líneas de prerequisito entre los nodos con un SVG superpuesto. Sin
 * `levels`/`onChange*` se renderiza en modo solo-lectura (vista previa del
 * admin); con esas props, en modo interactivo (simulador público).
 */
export function SkillTreeCanvas({
  skills,
  levels,
  onIncrement,
  onDecrement,
  canIncrement,
  canDecrement,
  selectedSkillId,
  onSelect,
  disabled,
}: {
  skills: CanvasSkill[];
  levels?: Record<string, number>;
  onIncrement?: (skillId: string) => void;
  onDecrement?: (skillId: string) => void;
  canIncrement?: (skillId: string) => boolean;
  canDecrement?: (skillId: string) => boolean;
  selectedSkillId?: string | null;
  onSelect?: (skillId: string) => void;
  disabled?: boolean;
}) {
  const interactive = Boolean(levels && (onIncrement || onSelect));
  const maxCol = skills.reduce((m, s) => Math.max(m, s.col), 0);
  const maxRow = skills.reduce((m, s) => Math.max(m, s.row), 0);
  const width = (maxCol + 1) * CELL_W;
  const height = (maxRow + 1) * CELL_H;
  const byId = new Map(skills.map((s) => [s.id, s]));

  function center(skill: CanvasSkill) {
    return { x: skill.col * CELL_W + CELL_W / 2, y: skill.row * CELL_H + CELL_H / 2 };
  }

  if (skills.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay habilidades cargadas.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ width, height }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
          aria-hidden="true"
        >
          {skills.flatMap((skill) =>
            skill.prerequisites.map((prereq) => {
              const from = byId.get(prereq.requiresSkillId);
              if (!from) return null;
              const a = center(from);
              const b = center(skill);
              const satisfied =
                interactive && (levels?.[prereq.requiresSkillId] ?? 0) >= prereq.requiredLevel;
              return (
                <line
                  key={`${skill.id}-${prereq.requiresSkillId}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={satisfied ? "var(--accent)" : "var(--border)"}
                  strokeWidth={2}
                  strokeOpacity={satisfied ? 0.7 : 0.5}
                />
              );
            })
          )}
        </svg>

        {skills.map((skill) => {
          const level = levels?.[skill.id] ?? 0;
          const { x, y } = center(skill);
          const selected = selectedSkillId === skill.id;
          const inc = canIncrement?.(skill.id) ?? false;
          const dec = canDecrement?.(skill.id) ?? level > 0;

          return (
            <div
              key={skill.id}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: x - CELL_W / 2, top: y - CELL_H / 2, width: CELL_W, height: CELL_H }}
            >
              <span className="text-xs font-semibold text-foreground">
                {level}/{skill.maxLevel}
              </span>
              <button
                type="button"
                disabled={!interactive}
                onClick={() => onSelect?.(skill.id)}
                style={{ width: NODE_SIZE, height: NODE_SIZE }}
                className={`flex items-center justify-center rounded-full border-2 bg-background-elevated transition-colors ${
                  selected
                    ? "border-accent shadow-[0_0_0_3px_rgba(111,224,245,0.25)]"
                    : level > 0
                      ? "border-accent/60"
                      : "border-border"
                } ${interactive ? "cursor-pointer hover:border-accent" : ""}`}
              >
                {skill.iconUrl ? (
                  <img src={skill.iconUrl} alt="" className="h-8 w-8 object-contain" />
                ) : (
                  <span className="text-[10px] text-muted">{skill.name.slice(0, 2).toUpperCase()}</span>
                )}
              </button>
              <span className="max-w-full truncate text-[11px] text-muted" title={skill.name}>
                {skill.name}
              </span>
              {interactive && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={disabled || !dec}
                    onClick={() => onDecrement?.(skill.id)}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-muted hover:border-accent hover:text-accent disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    disabled={disabled || !inc}
                    onClick={() => onIncrement?.(skill.id)}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-muted hover:border-accent hover:text-accent disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
