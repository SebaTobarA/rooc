/**
 * Carga puntual de la base de datos real de cartas (dbcards_import.json),
 * provista por el dueño del proyecto. A diferencia de scripts/import.ts
 * (que espera filas planas CSV/JSON), el archivo de origen tiene objetos
 * anidados (estadisticas, awaken, refine, collection_bonus) que acá se
 * aplanan a texto legible antes de guardarlos, siguiendo la misma filosofía
 * de "texto libre" que Card.stats/awaken/refine/collectionBonus.
 *
 * Uso:
 *   npx tsx scripts/import-cards-real-data.ts --file "C:/ruta/a/dbcards_import.json"
 */
import { readFileSync } from "node:fs";
import { CardRarity, CardSlot } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

type RawCard = {
  id: string;
  nombre: string;
  tipo: string;
  rareza: string;
  "clase/rol": string;
  estadisticas: Record<string, string | number>;
  descripcion: string;
  "efecto/habilidad": string;
  collection_bonus: Record<string, string | number>;
  awaken: string | Record<string, string>;
  refine: string | Record<string, string>;
};

const SLOT_MAP: Record<string, CardSlot> = {
  "Main-Hand": CardSlot.MAIN_HAND,
  "Off-Hand": CardSlot.OFF_HAND,
  Armor: CardSlot.ARMOR,
  Cloak: CardSlot.CLOAK,
  Shoes: CardSlot.SHOES,
  Accessory: CardSlot.ACCESSORY,
  Pendiente: CardSlot.PENDIENTE,
  Headwear: CardSlot.HEADWEAR,
  Facewear: CardSlot.FACEWEAR,
  Mouthwear: CardSlot.MOUTHWEAR,
  Backwear: CardSlot.BACKWEAR,
  Costume: CardSlot.COSTUME,
};

const RARITY_MAP: Record<string, CardRarity> = {
  Verde: CardRarity.VERDE,
  Azul: CardRarity.AZUL,
  Morada: CardRarity.MORADA,
};

function formatKeyValueObject(obj: Record<string, string | number>): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) return "";
  return entries.map(([key, value]) => `${key}: ${value}`).join("; ");
}

function formatTiered(value: string | Record<string, string>): string {
  if (typeof value === "string") return value;
  const entries = Object.entries(value);
  if (entries.length === 0) return "";
  return entries.map(([key, text]) => `${key}: ${text}`).join("; ");
}

function slugFromId(id: string): string {
  return id.replace(/_/g, "-");
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function main() {
  const { file } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error("--file es obligatorio (ruta al dbcards_import.json).");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(file, "utf-8")) as { cartas: RawCard[] };
  const cartas = raw.cartas;
  console.log(`Cargando ${cartas.length} cartas desde "${file}"...`);

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const carta of cartas) {
    try {
      const slot = SLOT_MAP[carta.tipo];
      if (!slot) throw new Error(`tipo desconocido: "${carta.tipo}"`);
      const rarity = RARITY_MAP[carta.rareza];
      if (!rarity) throw new Error(`rareza desconocida: "${carta.rareza}"`);

      const slug = slugFromId(carta.id);
      const data = {
        name: carta.nombre,
        slot,
        rarity,
        classRestriction: carta["clase/rol"]?.trim() ?? "",
        description: carta.descripcion?.trim() ?? "",
        ability: carta["efecto/habilidad"]?.trim() ?? "",
        stats: formatKeyValueObject(carta.estadisticas ?? {}),
        collectionBonus: formatKeyValueObject(carta.collection_bonus ?? {}),
        awaken: formatTiered(carta.awaken ?? ""),
        refine: formatTiered(carta.refine ?? ""),
        isPlaceholder: false,
      };

      const existing = await prisma.card.findUnique({ where: { slug } });
      if (existing) {
        await prisma.card.update({ where: { slug }, data });
        updated++;
      } else {
        await prisma.card.create({ data: { ...data, slug } });
        created++;
      }
    } catch (err) {
      errors.push(`${carta.id}: ${(err as Error).message}`);
    }
  }

  console.log(`Creadas: ${created} · Actualizadas: ${updated}`);
  if (errors.length > 0) {
    console.log(`Errores (${errors.length}):`);
    for (const error of errors) console.log(`  - ${error}`);
  }
}

main()
  .catch((err) => {
    console.error("Error inesperado:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
