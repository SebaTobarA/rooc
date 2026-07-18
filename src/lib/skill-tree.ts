import { prisma } from "@/lib/prisma";
import type { Job, SavedBuild, Skill, SkillPrerequisite } from "@prisma/client";
import type { SessionPayload } from "@/lib/session";
import { getGuildRolesCached } from "@/lib/discord-bot";
import { resolveJobFromRoles } from "@/lib/discord-job-roles";

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

/**
 * Builds SENT visibles para la sesión actual: se cruza la clase de Discord
 * del jugador (mismo mecanismo que /panel/perfil, vía discord-job-roles.ts)
 * con la clase (Job transcendente) de cada SavedBuild — no importa quién la
 * haya creado, solo que el jugador tenga el rol de esa clase puesto.
 */
export async function getActiveBuildsForSession(
  session: SessionPayload | null
): Promise<{ className: string | null; builds: (SavedBuild & { job: Job })[] }> {
  if (!session?.discordId) return { className: null, builds: [] };

  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
  if (!user) return { className: null, builds: [] };

  let className: string | null = null;
  try {
    const guildRoles = await getGuildRolesCached();
    className = resolveJobFromRoles(user.roles, guildRoles);
  } catch {
    className = null;
  }

  if (!className) return { className: null, builds: [] };

  const job = await prisma.job.findFirst({ where: { name: className, tier: "TRANSCENDENT" } });
  if (!job) return { className, builds: [] };

  const builds = await prisma.savedBuild.findMany({
    where: { jobId: job.id, status: "SENT" },
    include: { job: true },
    orderBy: { createdAt: "desc" },
  });

  return { className, builds };
}
