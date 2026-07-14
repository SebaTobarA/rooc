import type { MonsterRace, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MonsterCard } from "@/components/monster-card";
import { FilterField, FilterForm, filterInputClass } from "@/components/filter-form";
import { RACE_LABEL } from "@/lib/labels";

export const metadata = {
  title: "Monstruos",
};

export const dynamic = "force-dynamic";

export default async function MonstersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    race?: string;
    mapId?: string;
    levelMin?: string;
    levelMax?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const race = params.race as MonsterRace | undefined;
  const mapId = params.mapId?.trim() ?? "";
  const levelMin = params.levelMin ? Number(params.levelMin) : undefined;
  const levelMax = params.levelMax ? Number(params.levelMax) : undefined;

  const where: Prisma.MonsterWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(race ? { race } : {}),
    ...(mapId ? { maps: { some: { mapId } } } : {}),
    ...(levelMin !== undefined || levelMax !== undefined
      ? {
          level: {
            ...(levelMin !== undefined ? { gte: levelMin } : {}),
            ...(levelMax !== undefined ? { lte: levelMax } : {}),
          },
        }
      : {}),
  };

  const [monsters, maps] = await Promise.all([
    prisma.monster.findMany({ where, orderBy: { level: "asc" } }),
    prisma.gameMap.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="heading-gradient text-2xl font-bold">Bestiario</h1>
      <p className="mt-1 text-sm text-muted">
        {monsters.length} resultado(s). Estadísticas base y ubicación de cada
        monstruo.
      </p>

      <FilterForm basePath="/panel/monsters">
        <FilterField label="Buscar por nombre">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Ej: lobo"
            className={filterInputClass}
          />
        </FilterField>

        <FilterField label="Raza">
          <select name="race" defaultValue={race ?? ""} className={filterInputClass}>
            <option value="">Todas</option>
            {Object.entries(RACE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Mapa">
          <select name="mapId" defaultValue={mapId} className={filterInputClass}>
            <option value="">Todos</option>
            {maps.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Nivel mín.">
          <input
            type="number"
            name="levelMin"
            min={1}
            defaultValue={params.levelMin ?? ""}
            className={`${filterInputClass} w-24`}
          />
        </FilterField>

        <FilterField label="Nivel máx.">
          <input
            type="number"
            name="levelMax"
            min={1}
            defaultValue={params.levelMax ?? ""}
            className={`${filterInputClass} w-24`}
          />
        </FilterField>
      </FilterForm>

      {monsters.length === 0 ? (
        <p className="text-sm text-muted">No se encontraron monstruos con esos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {monsters.map((monster) => (
            <MonsterCard key={monster.id} monster={monster} />
          ))}
        </div>
      )}
    </div>
  );
}
