import Link from "next/link";
import { getJobTree } from "@/lib/skill-tree";
import { NewJobForm } from "@/components/admin/skill-tree/new-job-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Build PVP",
};

export default async function AdminBuildPvpPage() {
  const baseJobs = await getJobTree();

  return (
    <div>
      <p className="text-sm text-muted">
        Árbol de clases del simulador de <span className="text-foreground">/panel/build-pvp</span>.
        Cada clase base tiene su 2da clase y su 2da transcendente — hacé clic en cualquiera para
        cargarle sus habilidades. Los puntos por tier (40) y el total (120) son fijos.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {baseJobs.map((base) => (
          <div key={base.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/admin/build-pvp/${base.id}`} className="font-semibold text-foreground hover:text-accent">
                {base.name}
              </Link>
              <span className="text-xs text-muted">1st</span>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {base.children.map((second) => (
                <div key={second.id} className="rounded-md border border-border bg-background-elevated p-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/admin/build-pvp/${second.id}`} className="text-sm text-foreground hover:text-accent">
                      {second.name}
                    </Link>
                    <span className="text-xs text-muted">2nd</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                    {second.children.map((trans) => (
                      <div key={trans.id} className="flex items-center justify-between gap-2">
                        <Link href={`/admin/build-pvp/${trans.id}`} className="text-xs text-accent hover:underline">
                          {trans.name}
                        </Link>
                        <span className="text-[10px] uppercase text-muted">Trans. 2nd</span>
                      </div>
                    ))}
                    <NewJobForm parentId={second.id} label="+ 2da transcendente" />
                  </div>
                </div>
              ))}
              <NewJobForm parentId={base.id} label="+ 2da clase" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Agregar clase base (1st job)</h2>
        <div className="mt-2">
          <NewJobForm parentId={undefined} label="+ Clase base" />
        </div>
      </div>
    </div>
  );
}
