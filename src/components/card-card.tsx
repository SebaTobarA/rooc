import Image from "next/image";
import Link from "next/link";
import type { Card } from "@prisma/client";
import { CARD_SLOT_LABEL } from "@/lib/labels";
import { CardRarityBadge } from "@/components/card-rarity-badge";

export function CardCard({ card }: { card: Card }) {
  return (
    <Link
      href={`/panel/cards/${card.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/10"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background-elevated p-1.5">
          <Image
            src={card.iconUrl || "/icons/placeholder-card.svg"}
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground group-hover:text-accent">
            {card.name}
          </p>
          <p className="text-xs text-muted">{CARD_SLOT_LABEL[card.slot]}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <CardRarityBadge rarity={card.rarity} />
        {card.isPlaceholder && (
          <span className="text-[10px] uppercase tracking-wide text-muted">
            Placeholder
          </span>
        )}
      </div>
    </Link>
  );
}
