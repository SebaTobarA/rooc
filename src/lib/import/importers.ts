import {
  Element,
  EquipSlot,
  ItemRarity,
  MonsterRace,
  MonsterSize,
  WeaponType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { RawRow } from "./parse";

export type ImportSummary = {
  created: number;
  updated: number;
  errors: string[];
};

function newSummary(): ImportSummary {
  return { created: 0, updated: 0, errors: [] };
}

/** Valida que `raw` (sin importar mayúsculas/minúsculas) sea uno de los
 * valores del enum de Prisma `enumObj`, y devuelve el valor normalizado. */
function parseEnumField<T extends string>(
  raw: string,
  enumObj: Record<string, T>,
  fieldName: string
): T {
  const normalized = raw.trim().toUpperCase();
  const allowed = Object.values(enumObj);
  if (!allowed.includes(normalized as T)) {
    throw new Error(
      `valor "${raw}" inválido para "${fieldName}". Valores permitidos: ${allowed.join(", ")}`
    );
  }
  return normalized as T;
}

function requireField(row: RawRow, field: string): string {
  const value = row[field];
  if (value === undefined || value === null || value.trim() === "") {
    throw new Error(`falta la columna obligatoria "${field}"`);
  }
  return value.trim();
}

function optionalNumber(row: RawRow, field: string): number | undefined {
  const value = row[field];
  if (value === undefined || value.trim() === "") return undefined;
  const num = Number(value);
  if (Number.isNaN(num)) throw new Error(`valor no numérico en "${field}": "${value}"`);
  return num;
}

function requireNumber(row: RawRow, field: string): number {
  const num = optionalNumber(row, field);
  if (num === undefined) throw new Error(`falta la columna obligatoria "${field}"`);
  return num;
}

// ---------------------------------------------------------------------------
// Ítems
// ---------------------------------------------------------------------------

export async function importItems(rows: RawRow[]): Promise<ImportSummary> {
  const summary = newSummary();

  for (const [index, row] of rows.entries()) {
    try {
      const name = requireField(row, "name");
      const slug = row.slug?.trim() || slugify(name);
      const slot = parseEnumField(requireField(row, "slot"), EquipSlot, "slot");
      const weaponType = row.weaponType
        ? parseEnumField(row.weaponType, WeaponType, "weaponType")
        : WeaponType.NONE;
      const rarity = row.rarity
        ? parseEnumField(row.rarity, ItemRarity, "rarity")
        : ItemRarity.COMUN;
      const levelReq = requireNumber(row, "levelReq");

      const data = {
        name,
        slug,
        category: row.category?.trim() || "equipo",
        slot,
        weaponType,
        levelReq,
        rarity,
        description: row.description?.trim() ?? "",
        stats: row.stats?.trim() ?? "",
        iconUrl: row.iconUrl?.trim() || null,
        isPlaceholder: false,
      };

      const existing = await prisma.item.findUnique({ where: { slug } });
      if (existing) {
        await prisma.item.update({ where: { slug }, data });
        summary.updated++;
      } else {
        await prisma.item.create({ data });
        summary.created++;
      }
    } catch (err) {
      summary.errors.push(`Fila ${index + 2}: ${(err as Error).message}`);
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Monstruos
// ---------------------------------------------------------------------------

export async function importMonsters(rows: RawRow[]): Promise<ImportSummary> {
  const summary = newSummary();

  for (const [index, row] of rows.entries()) {
    try {
      const name = requireField(row, "name");
      const slug = row.slug?.trim() || slugify(name);
      const element = row.element
        ? parseEnumField(row.element, Element, "element")
        : Element.NEUTRO;
      const race = parseEnumField(requireField(row, "race"), MonsterRace, "race");
      const size = row.size
        ? parseEnumField(row.size, MonsterSize, "size")
        : MonsterSize.MEDIANO;

      const data = {
        name,
        slug,
        level: requireNumber(row, "level"),
        hp: requireNumber(row, "hp"),
        atk: requireNumber(row, "atk"),
        atkMax: optionalNumber(row, "atkMax") ?? null,
        def: optionalNumber(row, "def") ?? 0,
        element,
        elementLevel: optionalNumber(row, "elementLevel") ?? 1,
        race,
        size,
        description: row.description?.trim() ?? "",
        iconUrl: row.iconUrl?.trim() || null,
        isPlaceholder: false,
      };

      const existing = await prisma.monster.findUnique({ where: { slug } });
      if (existing) {
        await prisma.monster.update({ where: { slug }, data });
        summary.updated++;
      } else {
        await prisma.monster.create({ data });
        summary.created++;
      }
    } catch (err) {
      summary.errors.push(`Fila ${index + 2}: ${(err as Error).message}`);
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Mapas
// ---------------------------------------------------------------------------

export async function importMaps(rows: RawRow[]): Promise<ImportSummary> {
  const summary = newSummary();

  for (const [index, row] of rows.entries()) {
    try {
      const name = requireField(row, "name");
      const slug = row.slug?.trim() || slugify(name);
      const region = requireField(row, "region");

      const data = {
        name,
        slug,
        region,
        description: row.description?.trim() ?? "",
        isPlaceholder: false,
      };

      const existing = await prisma.gameMap.findUnique({ where: { slug } });
      if (existing) {
        await prisma.gameMap.update({ where: { slug }, data });
        summary.updated++;
      } else {
        await prisma.gameMap.create({ data });
        summary.created++;
      }
    } catch (err) {
      summary.errors.push(`Fila ${index + 2}: ${(err as Error).message}`);
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Drops (referencian monstruo e ítem por nombre o por slug)
// ---------------------------------------------------------------------------

async function findMonsterByNameOrSlug(value: string) {
  const slug = slugify(value);
  return prisma.monster.findFirst({
    where: { OR: [{ slug: value }, { slug }, { name: value }] },
  });
}

async function findItemByNameOrSlug(value: string) {
  const slug = slugify(value);
  return prisma.item.findFirst({
    where: { OR: [{ slug: value }, { slug }, { name: value }] },
  });
}

export async function importDrops(rows: RawRow[]): Promise<ImportSummary> {
  const summary = newSummary();

  for (const [index, row] of rows.entries()) {
    try {
      const monsterRef = requireField(row, "monster");
      const itemRef = requireField(row, "item");
      const rate = requireNumber(row, "rate");
      if (rate < 0 || rate > 100) throw new Error(`"rate" debe estar entre 0 y 100 (recibido ${rate})`);

      const monster = await findMonsterByNameOrSlug(monsterRef);
      if (!monster) throw new Error(`no se encontró el monstruo "${monsterRef}" (cargalo antes que sus drops)`);

      const item = await findItemByNameOrSlug(itemRef);
      if (!item) throw new Error(`no se encontró el ítem "${itemRef}" (cargalo antes que sus drops)`);

      const existing = await prisma.drop.findUnique({
        where: { monsterId_itemId: { monsterId: monster.id, itemId: item.id } },
      });

      if (existing) {
        await prisma.drop.update({ where: { id: existing.id }, data: { rate } });
        summary.updated++;
      } else {
        await prisma.drop.create({ data: { monsterId: monster.id, itemId: item.id, rate } });
        summary.created++;
      }
    } catch (err) {
      summary.errors.push(`Fila ${index + 2}: ${(err as Error).message}`);
    }
  }

  return summary;
}

export type ImportEntity = "items" | "monsters" | "maps" | "drops";

export const importersByEntity: Record<ImportEntity, (rows: RawRow[]) => Promise<ImportSummary>> = {
  items: importItems,
  monsters: importMonsters,
  maps: importMaps,
  drops: importDrops,
};
