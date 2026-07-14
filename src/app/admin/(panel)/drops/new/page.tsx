import { prisma } from "@/lib/prisma";
import { DropForm } from "@/components/forms/drop-form";
import { createDrop } from "@/lib/actions/drops";

export const metadata = { title: "Nuevo drop" };
export const dynamic = "force-dynamic";

export default async function NewDropPage() {
  const [monsters, items] = await Promise.all([
    prisma.monster.findMany({ orderBy: { name: "asc" } }),
    prisma.item.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nuevo drop</h2>
      <DropForm monsters={monsters} items={items} action={createDrop} />
    </div>
  );
}
