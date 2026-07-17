import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MonsterForm } from "@/components/forms/monster-form";
import {
  addMonsterToMap,
  removeMonsterFromMap,
  updateMonster,
} from "@/lib/actions/monsters";
import { inputClass } from "@/components/forms/form-fields";
import { BackLink } from "@/components/admin/back-link";

export const metadata = { title: "Editar monstruo" };
export const dynamic = "force-dynamic";

export default async function EditMonsterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monster = await prisma.monster.findUnique({
    where: { id },
    include: { maps: { include: { map: true } } },
  });
  if (!monster) notFound();

  const allMaps = await prisma.gameMap.findMany({ orderBy: { name: "asc" } });
  const linkedMapIds = new Set(monster.maps.map((m) => m.mapId));
  const availableMaps = allMaps.filter((m) => !linkedMapIds.has(m.id));

  async function addToMapAction(formData: FormData) {
    "use server";
    const mapId = String(formData.get("mapId"));
    if (mapId) await addMonsterToMap(id, mapId);
  }

  return (
    <div>
      <BackLink href="/admin/monsters" label="Monstruos" />
      <h2 className="mb-4 text-lg font-semibold text-foreground">Editar {monster.name}</h2>
      <MonsterForm monster={monster} action={updateMonster.bind(null, id)} />

      <div className="mt-8 max-w-2xl">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Mapas donde aparece</h3>

        {monster.maps.length > 0 && (
          <ul className="mb-3 divide-y divide-border rounded-xl border border-border">
            {monster.maps.map(({ id: mapMonsterId, map }) => (
              <li key={mapMonsterId} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-foreground">{map.name}</span>
                <form action={removeMonsterFromMap.bind(null, mapMonsterId)}>
                  <button type="submit" className="text-muted hover:text-accent">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {availableMaps.length > 0 && (
          <form action={addToMapAction} className="flex gap-2">
            <select name="mapId" required className={`${inputClass} flex-1`}>
              <option value="">Elegí un mapa...</option>
              {availableMaps.map((map) => (
                <option key={map.id} value={map.id}>
                  {map.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-surface-hover"
            >
              Agregar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
