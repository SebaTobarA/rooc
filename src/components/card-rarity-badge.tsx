import type { CardRarity } from "@prisma/client";
import { CARD_RARITY_COLOR, CARD_RARITY_LABEL } from "@/lib/labels";

export function CardRarityBadge({ rarity }: { rarity: CardRarity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${CARD_RARITY_COLOR[rarity]}`}
    >
      {CARD_RARITY_LABEL[rarity]}
    </span>
  );
}
