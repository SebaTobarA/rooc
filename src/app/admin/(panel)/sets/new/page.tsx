import { ItemSetForm } from "@/components/forms/item-set-form";
import { createItemSet } from "@/lib/actions/item-sets";
import { BackLink } from "@/components/back-link";

export const metadata = { title: "Nuevo set" };

export default function NewItemSetPage() {
  return (
    <div>
      <BackLink href="/admin/sets" label="Sets" />
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nuevo set de equipamiento</h2>
      <ItemSetForm action={createItemSet} />
    </div>
  );
}
