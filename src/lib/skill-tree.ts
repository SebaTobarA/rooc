import { prisma } from "@/lib/prisma";
import type { Job, Skill, SkillPrerequisite } from "@prisma/client";

/** Puntos disponibles por tier (1st / 2nd / Trans. 2nd) — fijo, no configurable. */
export const POINTS_PER_TIER = 40;

export type SkillWithPrereqs = Skill & {
  prerequisites: (SkillPrerequisite & { requiresSkill: Skill })[];
};

export type JobWithSkills = Job & { skills: SkillWithPrereqs[] };

async function findJobWithSkills(id: string): Promise<JobWithSkills | null> {
  return prisma.job.findUnique({
    where: { id },
    include: {
      skills: {
        include: { prerequisites: { include: { requiresSkill: true } } },
        orderBy: [{ col: "asc" }, { row: "asc" }],
      },
    },
  });
}

/**
 * Las 3 clases de una cadena de build (1st -> 2nd -> Trans. 2nd) con sus
 * skills y prerequisitos, a partir del id de la clase transcendente
 * (la que se elige en el selector de /panel/build-pvp).
 */
export async function getJobChain(
  transcendentJobId: string
): Promise<[JobWithSkills, JobWithSkills, JobWithSkills] | null> {
  const trans = await findJobWithSkills(transcendentJobId);
  if (!trans || trans.tier !== "TRANSCENDENT" || !trans.parentId) return null;

  const second = await findJobWithSkills(trans.parentId);
  if (!second || !second.parentId) return null;

  const first = await findJobWithSkills(second.parentId);
  if (!first) return null;

  return [first, second, trans];
}

/** Árbol completo de clases (para el selector y para el panel de admin), agrupado por clase base. */
export async function getJobTree() {
  return prisma.job.findMany({
    where: { tier: "FIRST" },
    orderBy: { order: "asc" },
    include: {
      children: {
        orderBy: { order: "asc" },
        include: {
          children: { orderBy: { order: "asc" } },
        },
      },
    },
  });
}
