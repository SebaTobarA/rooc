"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Element, MonsterRace, MonsterSize } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const monsterSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  level: z.coerce.number().int().min(1),
  hp: z.coerce.number().int().min(0),
  atk: z.coerce.number().int().min(0),
  atkMax: z.coerce.number().int().min(0).optional(),
  def: z.coerce.number().int().min(0).default(0),
  element: z.nativeEnum(Element),
  elementLevel: z.coerce.number().int().min(1).max(4).default(1),
  race: z.nativeEnum(MonsterRace),
  size: z.nativeEnum(MonsterSize),
  description: z.string().default(""),
  iconUrl: z.string().optional(),
});

function parseMonsterForm(formData: FormData) {
  const atkMaxRaw = formData.get("atkMax");
  return monsterSchema.parse({
    name: formData.get("name"),
    level: formData.get("level"),
    hp: formData.get("hp"),
    atk: formData.get("atk"),
    atkMax: atkMaxRaw ? atkMaxRaw : undefined,
    def: formData.get("def") ?? 0,
    element: formData.get("element"),
    elementLevel: formData.get("elementLevel") ?? 1,
    race: formData.get("race"),
    size: formData.get("size"),
    description: formData.get("description") ?? "",
    iconUrl: formData.get("iconUrl") || undefined,
  });
}

function revalidateMonsterPaths(slug?: string) {
  revalidatePath("/panel/monsters");
  revalidatePath("/admin/monsters");
  if (slug) revalidatePath(`/panel/monsters/${slug}`);
}

export async function createMonster(formData: FormData) {
  const data = parseMonsterForm(formData);
  const slug = slugify(data.name);

  await prisma.monster.create({
    data: { ...data, slug, isPlaceholder: false },
  });

  revalidateMonsterPaths(slug);
  redirect("/admin/monsters");
}

export async function updateMonster(id: string, formData: FormData) {
  const data = parseMonsterForm(formData);
  const existing = await prisma.monster.findUniqueOrThrow({ where: { id } });
  const slug = data.name === existing.name ? existing.slug : slugify(data.name);

  await prisma.monster.update({
    where: { id },
    data: { ...data, slug },
  });

  revalidateMonsterPaths(existing.slug);
  revalidateMonsterPaths(slug);
  redirect("/admin/monsters");
}

export async function deleteMonster(id: string) {
  const existing = await prisma.monster.delete({ where: { id } });
  revalidateMonsterPaths(existing.slug);
  redirect("/admin/monsters");
}

// --- Relación Monstruo <-> Mapa -------------------------------------------

export async function addMonsterToMap(monsterId: string, mapId: string) {
  await prisma.mapMonster.upsert({
    where: { mapId_monsterId: { mapId, monsterId } },
    update: {},
    create: { mapId, monsterId },
  });
  revalidateMonsterPaths();
  revalidatePath("/panel/maps");
  revalidatePath("/admin/maps");
}

export async function removeMonsterFromMap(mapMonsterId: string) {
  await prisma.mapMonster.delete({ where: { id: mapMonsterId } });
  revalidateMonsterPaths();
  revalidatePath("/panel/maps");
  revalidatePath("/admin/maps");
}
