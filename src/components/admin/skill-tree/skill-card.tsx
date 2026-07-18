"use client";

import { useState } from "react";
import type { Skill } from "@prisma/client";
import type { SkillWithPrereqs } from "@/lib/skill-tree";
import { SkillForm } from "@/components/admin/skill-tree/skill-form";
import { PrerequisitesForm } from "@/components/admin/skill-tree/prerequisites-form";
import { updateSkill, deleteSkill, setSkillPrerequisites } from "@/lib/actions/skill-tree";

export function SkillCard({
  skill,
  jobId,
  otherSkills,
}: {
  skill: SkillWithPrereqs;
  jobId: string;
  otherSkills: Skill[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-background-elevated p-3">
      <div className="flex items-center gap-3">
        {skill.iconUrl ? (
          <img src={skill.iconUrl} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface text-[10px] text-muted">
            {skill.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{skill.name}</p>
          <p className="text-xs text-muted">
            Nivel máx. {skill.maxLevel} · col {skill.col}, fila {skill.row}
            {skill.prerequisites.length > 0 && ` · ${skill.prerequisites.length} prerequisito(s)`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
        >
          {open ? "Cerrar" : "Editar"}
        </button>
        <form action={deleteSkill.bind(null, skill.id, jobId)}>
          <button
            type="submit"
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-accent"
          >
            Borrar
          </button>
        </form>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-4 border-t border-border pt-3">
          <SkillForm skill={skill} action={updateSkill.bind(null, skill.id, jobId)} />
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Prerequisitos</p>
            <PrerequisitesForm
              skill={skill}
              otherSkills={otherSkills}
              action={setSkillPrerequisites.bind(null, skill.id, jobId)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
