import { prisma } from "@/lib/prisma";
import { DropForm } from "@/components/forms/drop-form";
import { createDrop } from "@/lib/actions/drops";
import { BackLink } from "@/components/admin/back-link";

export const metadata = { title: "Nuevo drop" };
export const dynamic = "force-dynamic";

export default async function NewDropPage() {
  const [monsters, items] = await Promise.all([
    prisma.monster.findMany({ orderBy: { name: "asc" } }),
    prisma.item.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <BackLink href="/admin/drops" label="Drops" />
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nuevo drop</h2>
      <DropForm monsters={monsters} items={items} action={createDrop} />
    </div>
  );
}
