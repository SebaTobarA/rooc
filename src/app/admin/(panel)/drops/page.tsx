import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteDrop } from "@/lib/actions/drops";

export const metadata = { title: "Drops" };
export const dynamic = "force-dynamic";

export default async function AdminDropsPage() {
  const drops = await prisma.drop.findMany({
    orderBy: { createdAt: "desc" },
    include: { monster: true, item: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Drops ({drops.length})</h2>
        <Link
          href="/admin/drops/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
        >
          + Nuevo drop
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Monstruo</th>
              <th className="px-4 py-2 font-medium">Ítem</th>
              <th className="px-4 py-2 font-medium">Probabilidad</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {drops.map((drop) => (
              <tr key={drop.id}>
                <td className="px-4 py-2 text-foreground">{drop.monster.name}</td>
                <td className="px-4 py-2 text-foreground">{drop.item.name}</td>
                <td className="px-4 py-2 text-accent">{drop.rate}%</td>
                <td className="px-4 py-2">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/drops/${drop.id}/edit`}
                      className="text-accent hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={deleteDrop.bind(null, drop.id)}>
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
