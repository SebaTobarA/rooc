import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/back-link";
import { SkillTreeCanvas } from "@/components/panel/build-pvp/skill-tree-canvas";
import { SkillCard } from "@/components/admin/skill-tree/skill-card";
import { SkillForm } from "@/components/admin/skill-tree/skill-form";
import { JobEditForm } from "@/components/admin/skill-tree/job-edit-form";
import { updateJob, deleteJob, createSkill } from "@/lib/actions/skill-tree";

export const dynamic = "force-dynamic";

const TIER_LABEL = { FIRST: "1st Job", SECOND: "2nd Job", TRANSCENDENT: "Trans. 2nd" } as const;

export default async function AdminJobSkillsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      parent: { include: { parent: true } },
      skills: {
        include: { prerequisites: { include: { requiresSkill: true } } },
        orderBy: [{ col: "asc" }, { row: "asc" }],
      },
    },
  });

  if (!job) notFound();

  const breadcrumb = [job.parent?.parent?.name, job.parent?.name, job.name].filter(Boolean).join(" → ");

  return (
    <div>
      <BackLink href="/admin/build-pvp" label="Build PVP" />

      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{breadcrumb}</h2>
          <p className="text-xs text-muted">{TIER_LABEL[job.tier]}</p>
        </div>
        <form action={deleteJob.bind(null, job.id)}>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-accent"
          >
            Borrar clase
          </button>
        </form>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <JobEditForm job={job} action={updateJob.bind(null, job.id)} />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground">Vista previa del árbol</h3>
        <div className="mt-2 rounded-xl border border-border bg-surface p-4">
          <SkillTreeCanvas skills={job.skills} />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground">Habilidades ({job.skills.length})</h3>
        <div className="mt-2 flex flex-col gap-2">
          {job.skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              jobId={job.id}
              otherSkills={job.skills.filter((s) => s.id !== skill.id)}
            />
          ))}
          {job.skills.length === 0 && (
            <p className="text-sm text-muted">Todavía no hay habilidades cargadas.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Agregar habilidad</h3>
        <div className="mt-3">
          <SkillForm action={createSkill.bind(null, job.id)} />
        </div>
      </div>
    </div>
  );
}
