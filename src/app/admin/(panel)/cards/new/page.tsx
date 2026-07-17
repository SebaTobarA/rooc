import { CardForm } from "@/components/forms/card-form";
import { createCard } from "@/lib/actions/cards";
import { BackLink } from "@/components/back-link";

export const metadata = { title: "Nueva carta" };
export const dynamic = "force-dynamic";

export default function NewCardPage() {
  return (
    <div>
      <BackLink href="/admin/cards" label="Cartas" />
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nueva carta</h2>
      <CardForm action={createCard} />
    </div>
  );
}
