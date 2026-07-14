import Image from "next/image";
import Link from "next/link";
import type { Monster } from "@prisma/client";
import { ELEMENT_LABEL, RACE_LABEL } from "@/lib/labels";

export function MonsterCard({ monster }: { monster: Monster }) {
  return (
    <Link
      href={`/monsters/${monster.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/60 hover:bg-surface-hover"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background-elevated p-1.5">
          <Image
            src={monster.iconUrl ?? "/icons/placeholder-monster.svg"}
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground group-hover:text-accent">
            {monster.name}
          </p>
          <p className="text-xs text-muted">
            Nivel {monster.level} · {RACE_LABEL[monster.race]}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>HP {monster.hp.toLocaleString("es-AR")}</span>
        <span>{ELEMENT_LABEL[monster.element]}</span>
      </div>
    </Link>
  );
}
