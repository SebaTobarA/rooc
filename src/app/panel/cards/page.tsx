import type { CardRarity, CardSlot, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CardCard } from "@/components/card-card";
import { FilterField, FilterForm, filterInputClass } from "@/components/filter-form";
import { CARD_SLOT_LABEL, CARD_RARITY_LABEL } from "@/lib/labels";

export const metadata = {
  title: "Cartas",
};

export const dynamic = "force-dynamic";

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; slot?: string; rarity?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const slot = params.slot as CardSlot | undefined;
  const rarity = params.rarity as CardRarity | undefined;

  const where: Prisma.CardWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(slot ? { slot } : {}),
    ...(rarity ? { rarity } : {}),
  };

  const cards = await prisma.card.findMany({
    where,
    orderBy: [{ rarity: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="heading-gradient text-2xl font-bold">Cartas</h1>
      <p className="mt-1 text-sm text-muted">
        {cards.length} resultado(s). Cartas equipables por slot, con bonos de
        colección, despertar y refine.
      </p>

      <FilterForm basePath="/panel/cards">
        <FilterField label="Buscar por nombre">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Ej: Condor"
            className={filterInputClass}
          />
        </FilterField>

        <FilterField label="Slot">
          <select name="slot" defaultValue={slot ?? ""} className={filterInputClass}>
            <option value="">Todos</option>
            {Object.entries(CARD_SLOT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Rareza">
          <select name="rarity" defaultValue={rarity ?? ""} className={filterInputClass}>
            <option value="">Todas</option>
            {Object.entries(CARD_RARITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterForm>

      {cards.length === 0 ? (
        <p className="text-sm text-muted">No se encontraron cartas con esos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <CardCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
