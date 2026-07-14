import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteMap } from "@/lib/actions/maps";

export const metadata = { title: "Mapas" };
export const dynamic = "force-dynamic";

export default async function AdminMapsPage() {
  const maps = await prisma.gameMap.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { monsters: true, npcs: true } } },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Mapas ({maps.length})</h2>
        <Link
          href="/admin/maps/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
        >
          + Nuevo mapa
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Región</th>
              <th className="px-4 py-2 font-medium">Monstruos</th>
              <th className="px-4 py-2 font-medium">NPCs</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {maps.map((map) => (
              <tr key={map.id}>
                <td className="px-4 py-2 text-foreground">{map.name}</td>
                <td className="px-4 py-2 text-muted">{map.region}</td>
                <td className="px-4 py-2 text-muted">{map._count.monsters}</td>
                <td className="px-4 py-2 text-muted">{map._count.npcs}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/maps/${map.id}/edit`}
                      className="text-accent hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={deleteMap.bind(null, map.id)}>
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
