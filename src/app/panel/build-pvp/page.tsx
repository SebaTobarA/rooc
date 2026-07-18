import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { getJobTree, getJobChain } from "@/lib/skill-tree";
import { JobSelector } from "@/components/panel/build-pvp/job-selector";
import { SkillPlanner } from "@/components/panel/build-pvp/skill-planner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Build PVP",
};

export default async function BuildPvpPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);

  if (!permissions.canViewParty) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Sin acceso</h1>
        <p className="mt-2 text-sm text-muted">
          Tu rol no tiene habilitada la sección de Build PVP. Si crees que es un error, consulta
          con un administrador del server.
        </p>
      </div>
    );
  }

  const { job: selectedJobId } = await searchParams;
  const [baseJobs, chain] = await Promise.all([
    getJobTree(),
    selectedJobId ? getJobChain(selectedJobId) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent">Personaje</span>
      <h1 className="heading-gradient mt-1 text-2xl font-bold sm:text-3xl">Skill Planner</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Planea un build: elige una clase y distribuye sus 40 puntos por tier en el árbol —
        prerequisitos, niveles máximos y bloqueos entre tiers se respetan igual que en el juego.
      </p>

      <div className="mt-6">
        <JobSelector baseJobs={baseJobs} selectedJobId={selectedJobId} />
      </div>

      <div className="mt-6">
        {chain ? (
          <SkillPlanner key={selectedJobId} chain={chain} />
        ) : (
          <p className="text-sm text-muted">Elige una clase transcendente arriba para empezar.</p>
        )}
      </div>
    </div>
  );
}
