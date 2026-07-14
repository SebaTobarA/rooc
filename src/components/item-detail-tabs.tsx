"use client";

import { useState } from "react";
import type { ItemSet, ItemSetTier, ItemSetPieceBonus } from "@prisma/client";

type SetWithBonuses = ItemSet & { tiers: ItemSetTier[]; pieceBonuses: ItemSetPieceBonus[] };

export function ItemDetailTabs({
  stats,
  description,
  set,
}: {
  stats: string;
  description: string;
  set: SetWithBonuses | null;
}) {
  const [tab, setTab] = useState<"stats" | "build">("stats");

  const tabClass = (active: boolean) =>
    `border-b-2 px-3 py-2 text-sm font-medium ${
      active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
    }`;

  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b border-border">
        <button type="button" onClick={() => setTab("stats")} className={tabClass(tab === "stats")}>
          Stats
        </button>
        {set && (
          <button type="button" onClick={() => setTab("build")} className={tabClass(tab === "build")}>
            Build effect
          </button>
        )}
      </div>

      <div className="pt-4">
        {tab === "stats" && (
          <>
            {stats && <p className="text-accent">{stats}</p>}
            {description && <p className="mt-2 text-sm text-muted">{description}</p>}
            {!stats && !description && (
              <p className="text-sm text-muted">Todavía no hay stats cargadas para este ítem.</p>
            )}
          </>
        )}

        {tab === "build" && set && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-semibold text-foreground">{set.name}</p>
              {set.baseStatText && <p className="mt-1 text-sm text-accent">{set.baseStatText}</p>}
            </div>

            {set.tiers.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                  Bonos por nivel de refine
                </p>
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-border">
                    {set.tiers.map((tier) => (
                      <tr key={tier.id}>
                        <td className="py-1.5 pr-4 text-muted">Refine +{tier.refineLevel}</td>
                        <td className="py-1.5 text-foreground">{tier.statText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {set.pieceBonuses.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                  Bonos por cantidad de piezas equipadas
                </p>
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-border">
                    {set.pieceBonuses.map((bonus) => (
                      <tr key={bonus.id}>
                        <td className="py-1.5 pr-4 text-muted">{bonus.pieceCount} piezas</td>
                        <td className="py-1.5 text-foreground">{bonus.statText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
