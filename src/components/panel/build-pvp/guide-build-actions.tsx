"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateBuild, deleteBuild, sendBuild } from "@/lib/actions/build-history";

/** Publicar / ocultar / eliminar un tipo de build desde el editor de guías. */
export function GuideBuildActions({
  buildId,
  jobId,
  published,
}: {
  buildId: string;
  jobId: string;
  published: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await (published ? deactivateBuild(buildId) : sendBuild(buildId));
            router.refresh();
          })
        }
        className={`rounded-[10px] border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
          published
            ? "border-border text-muted hover:text-foreground"
            : "border-accent/60 text-accent hover:bg-accent/10"
        }`}
      >
        {published ? "Ocultar a los jugadores" : "Publicar a los jugadores"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm("¿Eliminar este tipo de build y toda su hoja? No se puede deshacer.")) return;
          startTransition(async () => {
            await deleteBuild(buildId);
            router.push(`/panel/build-pvp?job=${jobId}`);
          });
        }}
        className="rounded-[10px] border border-rose-500/50 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
      >
        Eliminar
      </button>
    </div>
  );
}
