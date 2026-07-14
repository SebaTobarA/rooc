import type { EquipSlot, ItemRarity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ItemCard } from "@/components/item-card";
import { FilterField, FilterForm, filterInputClass } from "@/components/filter-form";
import { EQUIP_SLOT_LABEL } from "@/lib/weapon-icons";
import { RARITY_LABEL } from "@/lib/labels";

export const metadata = {
  title: "Ítems",
};

export const dynamic = "force-dynamic";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; slot?: string; rarity?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const slot = params.slot as EquipSlot | undefined;
  const rarity = params.rarity as ItemRarity | undefined;

  const where: Prisma.ItemWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(slot ? { slot } : {}),
    ...(rarity ? { rarity } : {}),
  };

  const items = await prisma.item.findMany({
    where,
    orderBy: [{ levelReq: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="heading-gradient text-2xl font-bold">Ítems y equipamiento</h1>
      <p className="mt-1 text-sm text-muted">
        {items.length} resultado(s). Armas, armaduras y accesorios de la base
        de datos.
      </p>

      <FilterForm basePath="/panel/items">
        <FilterField label="Buscar por nombre">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Ej: espada"
            className={filterInputClass}
          />
        </FilterField>

        <FilterField label="Tipo / slot">
          <select name="slot" defaultValue={slot ?? ""} className={filterInputClass}>
            <option value="">Todos</option>
            {Object.entries(EQUIP_SLOT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Rareza">
          <select name="rarity" defaultValue={rarity ?? ""} className={filterInputClass}>
            <option value="">Todas</option>
            {Object.entries(RARITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterForm>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No se encontraron ítems con esos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
