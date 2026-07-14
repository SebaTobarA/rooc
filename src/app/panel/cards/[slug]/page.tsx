import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CARD_SLOT_LABEL } from "@/lib/labels";
import { CardRarityBadge } from "@/components/card-rarity-badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await prisma.card.findUnique({ where: { slug } });
  return { title: card?.name ?? "Carta no encontrada" };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/panel/cards" className="text-sm text-muted hover:text-foreground">
        ← Volver a cartas
      </Link>

      <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-border bg-background-elevated p-3">
          <Image
            src={card.iconUrl || "/icons/placeholder-card.svg"}
            alt=""
            width={80}
            height={80}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{card.name}</h1>
            <CardRarityBadge rarity={card.rarity} />
            {card.isPlaceholder && (
              <span className="text-[10px] uppercase tracking-wide text-muted">
                Dato de ejemplo
              </span>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Slot</dt>
              <dd className="text-foreground">{CARD_SLOT_LABEL[card.slot]}</dd>
            </div>
            {card.classRestriction && (
              <div>
                <dt className="text-muted">Clase / rol</dt>
                <dd className="text-foreground">{card.classRestriction}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-2">
        <DetailRow label="Estadísticas" value={card.stats} />
        <DetailRow label="Bono de colección" value={card.collectionBonus} />
        <DetailRow label="Efecto / habilidad" value={card.ability} />
        <DetailRow label="Descripción" value={card.description} />
        <DetailRow label="Despertar (Awaken)" value={card.awaken} />
        <DetailRow label="Refine" value={card.refine} />

        {!card.stats &&
          !card.collectionBonus &&
          !card.ability &&
          !card.description &&
          !card.awaken &&
          !card.refine && (
            <p className="text-sm text-muted">Todavía no hay datos cargados para esta carta.</p>
          )}
      </div>
    </div>
  );
}
