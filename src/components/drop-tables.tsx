import Image from "next/image";
import Link from "next/link";
import type { Drop, Item, Monster } from "@prisma/client";
import { resolveItemIcon } from "@/lib/weapon-icons";

function formatRate(rate: number): string {
  return `${rate % 1 === 0 ? rate : rate.toFixed(2)}%`;
}

/** Tabla de drop para la ficha de un ítem: qué monstruos lo dropean. */
export function DropsByMonster({
  drops,
}: {
  drops: (Drop & { monster: Monster })[];
}) {
  if (drops.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay drops cargados para este ítem.</p>;
  }

  const sorted = [...drops].sort((a, b) => b.rate - a.rate);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Monstruo</th>
            <th className="px-4 py-2 font-medium">Nivel</th>
            <th className="px-4 py-2 text-right font-medium">Probabilidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((drop) => (
            <tr key={drop.id} className="hover:bg-surface/60">
              <td className="px-4 py-2">
                <Link
                  href={`/monsters/${drop.monster.slug}`}
                  className="font-medium text-foreground hover:text-accent"
                >
                  {drop.monster.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-muted">{drop.monster.level}</td>
              <td className="px-4 py-2 text-right text-accent">{formatRate(drop.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tabla de drop para la ficha de un monstruo: qué ítems dropea. */
export function DropsByItem({ drops }: { drops: (Drop & { item: Item })[] }) {
  if (drops.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay drops cargados para este monstruo.</p>;
  }

  const sorted = [...drops].sort((a, b) => b.rate - a.rate);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Ítem</th>
            <th className="px-4 py-2 text-right font-medium">Probabilidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((drop) => (
            <tr key={drop.id} className="hover:bg-surface/60">
              <td className="px-4 py-2">
                <Link
                  href={`/items/${drop.item.slug}`}
                  className="flex items-center gap-2 font-medium text-foreground hover:text-accent"
                >
                  <Image
                    src={resolveItemIcon(drop.item)}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain"
                  />
                  {drop.item.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-right text-accent">{formatRate(drop.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
