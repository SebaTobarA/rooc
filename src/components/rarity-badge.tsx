import type { ItemRarity } from "@prisma/client";
import { RARITY_COLOR, RARITY_LABEL } from "@/lib/labels";

export function RarityBadge({ rarity }: { rarity: ItemRarity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${RARITY_COLOR[rarity]}`}
    >
      {RARITY_LABEL[rarity]}
    </span>
  );
}
