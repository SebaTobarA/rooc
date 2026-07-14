import { prisma } from "@/lib/prisma";
import { ItemForm } from "@/components/forms/item-form";
import { createItem } from "@/lib/actions/items";

export const metadata = { title: "Nuevo ítem" };
export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const sets = await prisma.itemSet.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nuevo ítem</h2>
      <ItemForm sets={sets} action={createItem} />
    </div>
  );
}
