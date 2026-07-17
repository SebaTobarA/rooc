import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ItemSetForm } from "@/components/forms/item-set-form";
import { updateItemSet } from "@/lib/actions/item-sets";
import { BackLink } from "@/components/admin/back-link";

export const metadata = { title: "Editar set" };
export const dynamic = "force-dynamic";

export default async function EditItemSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const set = await prisma.itemSet.findUnique({
    where: { id },
    include: { tiers: { orderBy: { refineLevel: "asc" } }, pieceBonuses: { orderBy: { pieceCount: "asc" } } },
  });
  if (!set) notFound();

  return (
    <div>
      <BackLink href="/admin/sets" label="Sets" />
      <h2 className="mb-4 text-lg font-semibold text-foreground">Editar {set.name}</h2>
      <ItemSetForm set={set} action={updateItemSet.bind(null, id)} />
    </div>
  );
}
