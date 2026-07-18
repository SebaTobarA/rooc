import Link from "next/link";
import type { Job } from "@prisma/client";

type SecondJob = Job & { children: Job[] };
type BaseJob = Job & { children: SecondJob[] };

function JobIcon({
  job,
  size,
  ring,
}: {
  job: Job;
  size: number;
  ring: boolean;
}) {
  const imageUrl = job.portraitUrl ?? job.iconUrl;
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-background-elevated ${
        ring ? "border-focus" : "border-border"
      }`}
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-muted">{job.name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

export function JobSelector({ baseJobs, selectedJobId }: { baseJobs: BaseJob[]; selectedJobId?: string }) {
  return (
    // Debajo de lg (mobile y tablet) se permite scroll horizontal con el
    // dedo (min-w-max fuerza que las columnas no se compriman). De lg para
    // arriba (web) las columnas envuelven a la línea siguiente en vez de
    // desbordar, así nunca aparece una barra de scroll en desktop.
    <div className="overflow-x-auto lg:overflow-x-visible rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex min-w-max gap-4 lg:min-w-0 lg:flex-wrap lg:justify-center">
        {baseJobs.map((base) => (
          <div key={base.id} className="flex flex-col items-center gap-2">
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
              {base.name}
            </span>
            <JobIcon job={base} size={44} ring={false} />

            {/* Una mini-columna por rama (2da clase + su(s) transcendente(s)),
                para que cada ícono quede alineado debajo de su propia 2da
                clase en vez de una lista vertical suelta (ver Archer: 3 ramas). */}
            <div className="flex items-start gap-2">
              {base.children.map((second) => (
                <div key={second.id} className="flex w-12 flex-col items-center gap-2">
                  <JobIcon job={second} size={32} ring={false} />

                  <div className="flex flex-col items-center gap-2">
                    {second.children.map((trans) => (
                      <Link
                        key={trans.id}
                        href={`?job=${trans.id}`}
                        scroll={false}
                        className="flex flex-col items-center gap-1"
                      >
                        <JobIcon job={trans} size={44} ring />
                        <span
                          className={`text-center text-[10px] font-medium leading-tight ${
                            selectedJobId === trans.id ? "text-focus" : "text-foreground"
                          }`}
                        >
                          {trans.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
