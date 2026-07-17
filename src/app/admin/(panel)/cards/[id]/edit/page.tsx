import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardForm } from "@/components/forms/card-form";
import { updateCard } from "@/lib/actions/cards";
import { BackLink } from "@/components/back-link";

export const metadata = { title: "Editar carta" };
export const dynamic = "force-dynamic";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) notFound();

  return (
    <div>
      <BackLink href="/admin/cards" label="Cartas" />
      <h2 className="mb-4 text-lg font-semibold text-foreground">Editar {card.name}</h2>
      <CardForm card={card} action={updateCard.bind(null, id)} />
    </div>
  );
}
