import { CardForm } from "@/components/forms/card-form";
import { createCard } from "@/lib/actions/cards";

export const metadata = { title: "Nueva carta" };
export const dynamic = "force-dynamic";

export default function NewCardPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nueva carta</h2>
      <CardForm action={createCard} />
    </div>
  );
}
