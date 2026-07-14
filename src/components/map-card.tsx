import Image from "next/image";
import Link from "next/link";
import type { GameMap } from "@prisma/client";

export function MapCard({
  map,
  monsterCount,
}: {
  map: GameMap;
  monsterCount: number;
}) {
  return (
    <Link
      href={`/maps/${map.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/10"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background-elevated p-1.5">
          <Image
            src="/icons/placeholder-map.svg"
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground group-hover:text-accent">
            {map.name}
          </p>
          <p className="text-xs text-muted">{map.region}</p>
        </div>
      </div>
      <p className="text-xs text-muted">{monsterCount} monstruo(s) registrados</p>
    </Link>
  );
}
