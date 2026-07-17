import { MonsterForm } from "@/components/forms/monster-form";
import { createMonster } from "@/lib/actions/monsters";
import { BackLink } from "@/components/admin/back-link";

export const metadata = { title: "Nuevo monstruo" };

export default function NewMonsterPage() {
  return (
    <div>
      <BackLink href="/admin/monsters" label="Monstruos" />
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nuevo monstruo</h2>
      <MonsterForm action={createMonster} />
    </div>
  );
}
