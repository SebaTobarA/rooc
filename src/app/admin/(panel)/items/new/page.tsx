import { ItemForm } from "@/components/forms/item-form";
import { createItem } from "@/lib/actions/items";

export const metadata = { title: "Nuevo ítem" };

export default function NewItemPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nuevo ítem</h2>
      <ItemForm action={createItem} />
    </div>
  );
}
