import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveItemIcon, EQUIP_SLOT_LABEL, WEAPON_TYPE_LABEL } from "@/lib/weapon-icons";
import { RarityBadge } from "@/components/rarity-badge";
import { DropsByMonster } from "@/components/drop-tables";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await prisma.item.findUnique({ where: { slug } });
  return { title: item?.name ?? "Ítem no encontrado" };
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const item = await prisma.item.findUnique({
    where: { slug },
    include: { drops: { include: { monster: true } } },
  });

  if (!item) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/items" className="text-sm text-muted hover:text-foreground">
        ← Volver a ítems
      </Link>

      <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-border bg-background-elevated p-3">
          <Image
            src={resolveItemIcon(item)}
            alt=""
            width={80}
            height={80}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{item.name}</h1>
            <RarityBadge rarity={item.rarity} />
            {item.isPlaceholder && (
              <span className="text-[10px] uppercase tracking-wide text-muted">
                Dato de ejemplo
              </span>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Tipo / slot</dt>
              <dd className="text-foreground">{EQUIP_SLOT_LABEL[item.slot]}</dd>
            </div>
            {item.slot === "WEAPON" && (
              <div>
                <dt className="text-muted">Tipo de arma</dt>
                <dd className="text-foreground">{WEAPON_TYPE_LABEL[item.weaponType]}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted">Nivel requerido</dt>
              <dd className="text-foreground">{item.levelReq}</dd>
            </div>
          </dl>

          {item.stats && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-muted">Stats / bonos</p>
              <p className="mt-1 text-accent">{item.stats}</p>
            </div>
          )}

          {item.description && (
            <p className="mt-4 text-sm text-muted">{item.description}</p>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          ¿Quién lo dropea?
        </h2>
        <DropsByMonster drops={item.drops} />
      </section>
    </div>
  );
}
