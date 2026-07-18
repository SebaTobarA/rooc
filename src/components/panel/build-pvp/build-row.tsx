"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { SavedBuild, Job } from "@prisma/client";
import { sendBuild, deactivateBuild, deleteBuild, renameBuild } from "@/lib/actions/build-history";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Pendiente de revisión",
  SENT: "Enviada — visible para los jugadores",
  DEACTIVATED: "Desactivada",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "text-amber-400 border-amber-500/40",
  SENT: "text-emerald-400 border-emerald-500/40",
  DEACTIVATED: "text-muted border-border",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function BuildRow({ build, index }: { build: SavedBuild & { job: Job }; index: number }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(build.name);
  const [isPending, startTransition] = useTransition();

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === build.name) {
      setEditing(false);
      setName(build.name);
      return;
    }
    startTransition(async () => {
      await renameBuild(build.id, trimmed);
      setEditing(false);
    });
  }

  return (
    <tr className="hover:bg-surface/60">
      <td className="px-4 py-2 text-muted">{index + 1}</td>
      <td className="px-4 py-2 text-foreground">{build.job.name}</td>
      <td className="px-4 py-2 text-foreground">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="rounded-md border border-border bg-background-elevated px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={isPending}
              className="rounded-md border border-accent/40 px-2 py-1 text-xs text-accent hover:bg-accent/10"
            >
              {isPending ? "…" : "OK"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(build.name);
              }}
              className="text-xs text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ) : (
          <Link href={`/panel/build-pvp?build=${build.id}`} className="hover:text-accent hover:underline">
            {build.name}
          </Link>
        )}
      </td>
      <td className="px-4 py-2 text-muted">@{build.createdByUsername}</td>
      <td className="px-4 py-2 text-muted">{DATE_FORMATTER.format(build.createdAt)}</td>
      <td className="px-4 py-2">
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[build.status]}`}>
          {STATUS_LABEL[build.status]}
        </span>
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-1.5">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              Editar
            </button>
          )}
          {build.status !== "SENT" && (
            <form action={sendBuild.bind(null, build.id)}>
              <button
                type="submit"
                className="rounded-md border border-accent/40 px-2 py-1 text-xs text-accent hover:bg-accent/10"
              >
                Enviar build
              </button>
            </form>
          )}
          {build.status !== "DEACTIVATED" && (
            <form action={deactivateBuild.bind(null, build.id)}>
              <button
                type="submit"
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
              >
                Desactivar
              </button>
            </form>
          )}
          <form action={deleteBuild.bind(null, build.id)}>
            <button
              type="submit"
              className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-accent"
            >
              Eliminar
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
