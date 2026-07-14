import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MapForm } from "@/components/forms/map-form";
import { addNpc, deleteNpc, updateMap } from "@/lib/actions/maps";
import { addMonsterToMap, removeMonsterFromMap } from "@/lib/actions/monsters";
import { inputClass } from "@/components/forms/form-fields";

export const metadata = { title: "Editar mapa" };
export const dynamic = "force-dynamic";

export default async function EditMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const map = await prisma.gameMap.findUnique({
    where: { id },
    include: {
      npcs: { orderBy: { name: "asc" } },
      monsters: { include: { monster: true } },
    },
  });
  if (!map) notFound();

  const allMonsters = await prisma.monster.findMany({ orderBy: { name: "asc" } });
  const linkedMonsterIds = new Set(map.monsters.map((m) => m.monsterId));
  const availableMonsters = allMonsters.filter((m) => !linkedMonsterIds.has(m.id));

  async function addNpcAction(formData: FormData) {
    "use server";
    await addNpc(id, formData);
  }

  async function addMonsterAction(formData: FormData) {
    "use server";
    const monsterId = String(formData.get("monsterId"));
    if (monsterId) await addMonsterToMap(monsterId, id);
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Editar {map.name}</h2>
      <MapForm map={map} action={updateMap.bind(null, id)} />

      <div className="mt-8 max-w-2xl">
        <h3 className="mb-2 text-sm font-semibold text-foreground">NPCs</h3>
        {map.npcs.length > 0 && (
          <ul className="mb-3 divide-y divide-border rounded-xl border border-border">
            {map.npcs.map((npc) => (
              <li key={npc.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-foreground">
                  {npc.name} {npc.role && <span className="text-muted">· {npc.role}</span>}
                </span>
                <form action={deleteNpc.bind(null, npc.id)}>
                  <button type="submit" className="text-muted hover:text-accent">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addNpcAction} className="flex flex-wrap gap-2">
          <input name="name" placeholder="Nombre del NPC" required className={`${inputClass} flex-1`} />
          <input name="role" placeholder="Rol (ej: Kafra, Comerciante)" className={`${inputClass} flex-1`} />
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-surface-hover"
          >
            Agregar NPC
          </button>
        </form>
      </div>

      <div className="mt-8 max-w-2xl">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Monstruos en este mapa</h3>
        {map.monsters.length > 0 && (
          <ul className="mb-3 divide-y divide-border rounded-xl border border-border">
            {map.monsters.map(({ id: mapMonsterId, monster }) => (
              <li key={mapMonsterId} className="flex items-center justify-between px-4 py-2 text-sm">
                <Link href={`/admin/monsters/${monster.id}/edit`} className="text-foreground hover:text-accent">
                  {monster.name}
                </Link>
                <form action={removeMonsterFromMap.bind(null, mapMonsterId)}>
                  <button type="submit" className="text-muted hover:text-accent">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {availableMonsters.length > 0 && (
          <form action={addMonsterAction} className="flex gap-2">
            <select name="monsterId" required className={`${inputClass} flex-1`}>
              <option value="">Elegí un monstruo...</option>
              {availableMonsters.map((monster) => (
                <option key={monster.id} value={monster.id}>
                  {monster.name}
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
