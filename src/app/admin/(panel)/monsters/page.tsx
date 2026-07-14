import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RACE_LABEL } from "@/lib/labels";
import { deleteMonster } from "@/lib/actions/monsters";

export const metadata = { title: "Monstruos" };
export const dynamic = "force-dynamic";

export default async function AdminMonstersPage() {
  const monsters = await prisma.monster.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Monstruos ({monsters.length})</h2>
        <Link
          href="/admin/monsters/new"
          className="btn-brand px-3 py-1.5 text-sm"
        >
          + Nuevo monstruo
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Nivel</th>
              <th className="px-4 py-2 font-medium">Raza</th>
              <th className="px-4 py-2 font-medium">Placeholder</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {monsters.map((monster) => (
              <tr key={monster.id}>
                <td className="px-4 py-2 text-foreground">{monster.name}</td>
                <td className="px-4 py-2 text-muted">{monster.level}</td>
                <td className="px-4 py-2 text-muted">{RACE_LABEL[monster.race]}</td>
                <td className="px-4 py-2 text-muted">{monster.isPlaceholder ? "Sí" : "No"}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/monsters/${monster.id}/edit`}
                      className="text-accent hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={deleteMonster.bind(null, monster.id)}>
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
