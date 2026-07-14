import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DropForm } from "@/components/forms/drop-form";
import { updateDrop } from "@/lib/actions/drops";

export const metadata = { title: "Editar drop" };
export const dynamic = "force-dynamic";

export default async function EditDropPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [drop, monsters, items] = await Promise.all([
    prisma.drop.findUnique({ where: { id } }),
    prisma.monster.findMany({ orderBy: { name: "asc" } }),
    prisma.item.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!drop) notFound();

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Editar drop</h2>
      <DropForm drop={drop} monsters={monsters} items={items} action={updateDrop.bind(null, id)} />
    </div>
  );
}
