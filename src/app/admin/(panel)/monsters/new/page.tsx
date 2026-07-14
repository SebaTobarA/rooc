import { MonsterForm } from "@/components/forms/monster-form";
import { createMonster } from "@/lib/actions/monsters";

export const metadata = { title: "Nuevo monstruo" };

export default function NewMonsterPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nuevo monstruo</h2>
      <MonsterForm action={createMonster} />
    </div>
  );
}
