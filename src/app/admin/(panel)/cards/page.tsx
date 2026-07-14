import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CARD_SLOT_LABEL, CARD_RARITY_LABEL } from "@/lib/labels";
import { deleteCard } from "@/lib/actions/cards";

export const metadata = { title: "Cartas" };
export const dynamic = "force-dynamic";

export default async function AdminCardsPage() {
  const cards = await prisma.card.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Cartas ({cards.length})</h2>
        <Link
          href="/admin/cards/new"
          className="btn-brand px-3 py-1.5 text-sm"
        >
          + Nueva carta
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Slot</th>
              <th className="px-4 py-2 font-medium">Rareza</th>
              <th className="px-4 py-2 font-medium">Placeholder</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cards.map((card) => (
              <tr key={card.id}>
                <td className="px-4 py-2 text-foreground">{card.name}</td>
                <td className="px-4 py-2 text-muted">{CARD_SLOT_LABEL[card.slot]}</td>
                <td className="px-4 py-2 text-muted">{CARD_RARITY_LABEL[card.rarity]}</td>
                <td className="px-4 py-2 text-muted">{card.isPlaceholder ? "Sí" : "No"}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/cards/${card.id}/edit`}
                      className="text-accent hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={deleteCard.bind(null, card.id)}>
                      <button type="submit" className="text-muted hover:text-accent">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
