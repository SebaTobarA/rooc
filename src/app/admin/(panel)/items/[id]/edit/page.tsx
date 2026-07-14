import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "@/components/forms/item-form";
import { updateItem } from "@/lib/actions/items";

export const metadata = { title: "Editar ítem" };
export const dynamic = "force-dynamic";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Editar {item.name}</h2>
      <ItemForm item={item} action={updateItem.bind(null, id)} />
    </div>
  );
}
