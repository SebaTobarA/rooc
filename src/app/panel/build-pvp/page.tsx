import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJobTree, getJobChain } from "@/lib/skill-tree";
import { readGuideEntries } from "@/lib/class-guide";
import { createGuideBuild } from "@/lib/actions/build-history";
import { JobSelector } from "@/components/panel/build-pvp/job-selector";
import { SkillPlanner } from "@/components/panel/build-pvp/skill-planner";
import { GuideSheetEditor } from "@/components/panel/build-pvp/guide-sheet-editor";
import { GuideBuildActions } from "@/components/panel/build-pvp/guide-build-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Guías de clase",
};

/**
 * Editor de guías de clase (antes "Build PVP"): por cada clase, una hoja por
 * tipo de build con su árbol de skills, accesorios, encantamientos, monturas
 * y equipo divino. Solo los admin editan; los jugadores ven la guía de su
 * clase, ya publicada, en el inicio del panel.
 */
export default async function ClassGuideEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; build?: string }>;
}) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Sin acceso</h1>
        <p className="mt-2 text-sm text-muted">
          Las guías de clase las editan los admin. La guía de tu clase la ves en el inicio del panel.
        </p>
      </div>
    );
  }

  const { job: jobParam, build: buildParam } = await searchParams;
  const loadedBuild = buildParam ? await prisma.savedBuild.findUnique({ where: { id: buildParam } }) : null;
  const selectedJobId = loadedBuild?.jobId ?? jobParam;

  const [baseJobs, chain, classBuilds, accessoryItems, allItems] = await Promise.all([
    getJobTree(),
    selectedJobId ? getJobChain(selectedJobId) : Promise.resolve(null),
    selectedJobId
      ? prisma.savedBuild.findMany({ where: { jobId: selectedJobId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] })
      : Promise.resolve([]),
    prisma.item.findMany({ where: { slot: "ACCESSORY" }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.item.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const build = loadedBuild ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="heading-gradient text-2xl font-extrabold sm:text-3xl">Guías de clase</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Una hoja por cada tipo de build de cada clase, con lo que digan los mentores. Solo los admin la editan; al
        publicarla, la ven en su inicio los jugadores que tienen esa clase.
      </p>

      <div className="mt-6">
        <JobSelector baseJobs={baseJobs} selectedJobId={selectedJobId} />
      </div>

      {!chain || !selectedJobId ? (
        <p className="mt-6 text-sm text-muted">Elige una clase transcendente arriba para editar su guía.</p>
      ) : (
        <>
          <section className="mt-6 rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-foreground">Tipos de build de {chain[2].name}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {classBuilds.map((candidate) => (
                <Link
                  key={candidate.id}
                  href={`/panel/build-pvp?job=${selectedJobId}&build=${candidate.id}`}
                  className={`flex items-center gap-2 rounded-[10px] border px-3 py-1.5 text-sm ${
                    candidate.id === build?.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-foreground hover:border-accent/60"
                  }`}
                >
                  {candidate.name}
                  <span
                    className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                      candidate.status === "SENT" ? "bg-emerald-500/15 text-emerald-400" : "bg-surface-hover text-muted"
                    }`}
                  >
                    {candidate.status === "SENT" ? "Publicada" : "Borrador"}
                  </span>
                </Link>
              ))}
              <form action={createGuideBuild.bind(null, selectedJobId)} className="flex items-center gap-2">
                <input
                  name="name"
                  required
                  maxLength={60}
                  placeholder="Nuevo tipo de build, ej. Full Support"
                  className="w-64 rounded-[10px] border border-border bg-background-elevated px-3 py-1.5 text-sm text-foreground"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-[10px] border border-accent/50 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
                >
                  <Plus className="h-4 w-4" />
                  Crear
                </button>
              </form>
            </div>
            {classBuilds.length === 0 && (
              <p className="mt-3 text-xs text-muted">
                Esta clase todavía no tiene guía. Crea su primer tipo de build (por ejemplo «Base» o «Doram Físico»).
              </p>
            )}
          </section>

          {build ? (
            <div className="mt-6 flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-foreground">{build.name}</h2>
                <GuideBuildActions buildId={build.id} jobId={selectedJobId} published={build.status === "SENT"} />
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">1. Árbol de skills</p>
                <SkillPlanner
                  key={build.id}
                  chain={chain}
                  initialLevels={build.allocations as Record<string, number>}
                  editBuildId={build.id}
                />
              </div>

              <GuideSheetEditor
                key={`sheet-${build.id}`}
                buildId={build.id}
                initial={{
                  name: build.name,
                  description: build.description,
                  accessories: readGuideEntries(build.accessories),
                  enchants: readGuideEntries(build.enchants),
                  mounts: readGuideEntries(build.mounts),
                  divineEquip: readGuideEntries(build.divineEquip),
                }}
                suggestions={{
                  accessories: accessoryItems.map((item) => item.name),
                  divineEquip: allItems.map((item) => item.name),
                }}
              />
            </div>
          ) : (
            classBuilds.length > 0 && (
              <p className="mt-6 text-sm text-muted">Elige un tipo de build de arriba para editar su hoja.</p>
            )
          )}
        </>
      )}
    </div>
  );
}
