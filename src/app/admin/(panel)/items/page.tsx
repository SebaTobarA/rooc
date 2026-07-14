import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EQUIP_SLOT_LABEL } from "@/lib/weapon-icons";
import { deleteItem } from "@/lib/actions/items";

export const metadata = { title: "Equipamiento" };
export const dynamic = "force-dynamic";

export default async function AdminItemsPage() {
  const items = await prisma.item.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Equipamiento ({items.length})</h2>
        <Link
          href="/admin/items/new"
          className="btn-brand px-3 py-1.5 text-sm"
        >
          + Nuevo ítem
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Slot</th>
              <th className="px-4 py-2 font-medium">Nivel</th>
              <th className="px-4 py-2 font-medium">Placeholder</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 text-foreground">{item.name}</td>
                <td className="px-4 py-2 text-muted">{EQUIP_SLOT_LABEL[item.slot]}</td>
                <td className="px-4 py-2 text-muted">{item.levelReq}</td>
                <td className="px-4 py-2 text-muted">{item.isPlaceholder ? "Sí" : "No"}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/items/${item.id}/edit`}
                      className="text-accent hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={deleteItem.bind(null, item.id)}>
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
