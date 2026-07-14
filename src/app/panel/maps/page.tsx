import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MapCard } from "@/components/map-card";
import { FilterField, FilterForm, filterInputClass } from "@/components/filter-form";

export const metadata = {
  title: "Mapas",
};

export const dynamic = "force-dynamic";

export default async function MapsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const region = params.region?.trim() ?? "";

  const where: Prisma.GameMapWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(region ? { region } : {}),
  };

  const [maps, regions] = await Promise.all([
    prisma.gameMap.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { monsters: true } } },
    }),
    prisma.gameMap.findMany({
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="heading-gradient text-2xl font-bold">Mapas</h1>
      <p className="mt-1 text-sm text-muted">
        {maps.length} resultado(s). Regiones, monstruos y NPCs de cada mapa.
      </p>

      <FilterForm basePath="/panel/maps">
        <FilterField label="Buscar por nombre">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Ej: cueva"
            className={filterInputClass}
          />
        </FilterField>

        <FilterField label="Región">
          <select name="region" defaultValue={region} className={filterInputClass}>
            <option value="">Todas</option>
            {regions.map((r) => (
              <option key={r.region} value={r.region}>
                {r.region}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterForm>

      {maps.length === 0 ? (
        <p className="text-sm text-muted">No se encontraron mapas con esos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <MapCard key={map.id} map={map} monsterCount={map._count.monsters} />
          ))}
        </div>
      )}
    </div>
  );
}
