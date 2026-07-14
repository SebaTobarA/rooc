import Image from "next/image";
import Link from "next/link";
import type { Item } from "@prisma/client";
import { resolveItemIcon, EQUIP_SLOT_LABEL } from "@/lib/weapon-icons";
import { RarityBadge } from "@/components/rarity-badge";

export function ItemCard({ item }: { item: Item }) {
  return (
    <Link
      href={`/items/${item.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/60 hover:bg-surface-hover"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background-elevated p-1.5">
          <Image
            src={resolveItemIcon(item)}
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground group-hover:text-accent">
            {item.name}
          </p>
          <p className="text-xs text-muted">
            {EQUIP_SLOT_LABEL[item.slot]} · Nivel {item.levelReq}+
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <RarityBadge rarity={item.rarity} />
        {item.isPlaceholder && (
          <span className="text-[10px] uppercase tracking-wide text-muted">
            Placeholder
          </span>
        )}
      </div>
    </Link>
  );
}
