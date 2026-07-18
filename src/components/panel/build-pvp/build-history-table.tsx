import type { SavedBuild, Job } from "@prisma/client";
import { BuildRow } from "@/components/panel/build-pvp/build-row";

export function BuildHistoryTable({ builds }: { builds: (SavedBuild & { job: Job })[] }) {
  if (builds.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay builds guardadas.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">ID</th>
            <th className="px-4 py-2 font-medium">Clase</th>
            <th className="px-4 py-2 font-medium">Nombre</th>
            <th className="px-4 py-2 font-medium">Creada por</th>
            <th className="px-4 py-2 font-medium">Fecha</th>
            <th className="px-4 py-2 font-medium">Estado</th>
            <th className="px-4 py-2 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {builds.map((build, index) => (
            <BuildRow key={build.id} build={build} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
