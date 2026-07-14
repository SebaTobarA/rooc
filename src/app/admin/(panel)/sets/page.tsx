import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteItemSet } from "@/lib/actions/item-sets";

export const metadata = { title: "Sets de equipamiento" };
export const dynamic = "force-dynamic";

export default async function AdminSetsPage() {
  const sets = await prisma.itemSet.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } }, tiers: true, pieceBonuses: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Sets de equipamiento ({sets.length})</h2>
        <Link href="/admin/sets/new" className="btn-brand px-3 py-1.5 text-sm">
          + Nuevo set
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Stat base</th>
              <th className="px-4 py-2 font-medium">Tiers de refine</th>
              <th className="px-4 py-2 font-medium">Bonos por piezas</th>
              <th className="px-4 py-2 font-medium">Equipamiento</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sets.map((set) => (
              <tr key={set.id}>
                <td className="px-4 py-2 text-foreground">{set.name}</td>
                <td className="px-4 py-2 text-muted">{set.baseStatText || "—"}</td>
                <td className="px-4 py-2 text-muted">{set.tiers.length}</td>
                <td className="px-4 py-2 text-muted">{set.pieceBonuses.length}</td>
                <td className="px-4 py-2 text-muted">{set._count.items}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-3">
                    <Link href={`/admin/sets/${set.id}/edit`} className="text-accent hover:underline">
                      Editar
                    </Link>
                    <form action={deleteItemSet.bind(null, set.id)}>
                      <button type="submit" className="text-muted hover:text-accent">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {sets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Todavía no hay sets cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
