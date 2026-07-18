"use client";

import { useState } from "react";
import type { Skill } from "@prisma/client";
import { SubmitButton } from "@/components/forms/form-fields";

export function PrerequisitesForm({
  skill,
  otherSkills,
  action,
}: {
  skill: { id: string; prerequisites: { requiresSkillId: string; requiredLevel: number }[] };
  otherSkills: Skill[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const requiredById = new Map(skill.prerequisites.map((p) => [p.requiresSkillId, p.requiredLevel]));
  const [checked, setChecked] = useState<Set<string>>(new Set(requiredById.keys()));

  if (otherSkills.length === 0) {
    return <p className="text-xs text-muted">No hay otras habilidades en este job todavía.</p>;
  }

  return (
    <form action={action} className="grid gap-2">
      {otherSkills.map((other) => {
        const isChecked = checked.has(other.id);
        return (
          <div key={other.id} className="flex items-center gap-2 text-xs">
            <label className="flex flex-1 items-center gap-2 text-muted">
              <input
                type="checkbox"
                name={`prereq-${other.id}`}
                checked={isChecked}
                onChange={(e) => {
                  const next = new Set(checked);
                  if (e.target.checked) next.add(other.id);
                  else next.delete(other.id);
                  setChecked(next);
                }}
                className="h-3.5 w-3.5 rounded border-border"
              />
              {other.name}
            </label>
            <span className="text-muted">nivel</span>
            <input
              type="number"
              name={`prereqLevel-${other.id}`}
              min={1}
              max={other.maxLevel}
              defaultValue={requiredById.get(other.id) ?? 1}
              disabled={!isChecked}
              className="w-14 rounded-md border border-border bg-background-elevated px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-accent disabled:opacity-40"
            />
          </div>
        );
      })}
      <div className="mt-1">
        <SubmitButton>Guardar prerequisitos</SubmitButton>
      </div>
    </form>
  );
}
