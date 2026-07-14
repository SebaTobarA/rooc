import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ELEMENT_LABEL, RACE_LABEL, SIZE_LABEL } from "@/lib/labels";
import { DropsByItem } from "@/components/drop-tables";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const monster = await prisma.monster.findUnique({ where: { slug } });
  return { title: monster?.name ?? "Monstruo no encontrado" };
}

export default async function MonsterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const monster = await prisma.monster.findUnique({
    where: { slug },
    include: {
      drops: { include: { item: true } },
      maps: { include: { map: true } },
    },
  });

  if (!monster) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/monsters" className="text-sm text-muted hover:text-foreground">
        ← Volver al bestiario
      </Link>

      <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-border bg-background-elevated p-3">
          <Image
            src={monster.iconUrl ?? "/icons/placeholder-monster.svg"}
            alt=""
            width={80}
            height={80}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{monster.name}</h1>
            {monster.isPlaceholder && (
              <span className="text-[10px] uppercase tracking-wide text-muted">
                Dato de ejemplo
              </span>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <Stat label="Nivel" value={monster.level} />
            <Stat label="HP" value={monster.hp.toLocaleString("es-AR")} />
            <Stat
              label="ATK"
              value={
                monster.atkMax
                  ? `${monster.atk} ~ ${monster.atkMax}`
                  : monster.atk
              }
            />
            <Stat label="DEF" value={monster.def} />
            <Stat
              label="Elemento"
              value={`${ELEMENT_LABEL[monster.element]} Lv.${monster.elementLevel}`}
            />
            <Stat label="Raza" value={RACE_LABEL[monster.race]} />
            <Stat label="Tamaño" value={SIZE_LABEL[monster.size]} />
          </dl>

          {monster.description && (
            <p className="mt-4 text-sm text-muted">{monster.description}</p>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Mapas donde aparece</h2>
        {monster.maps.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay mapas asociados.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {monster.maps.map(({ map }) => (
              <Link
                key={map.id}
                href={`/maps/${map.slug}`}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:border-accent/60 hover:text-accent"
              >
                {map.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Tabla de drops</h2>
        <DropsByItem drops={monster.drops} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
