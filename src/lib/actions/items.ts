"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EquipSlot, ItemRarity, WeaponType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const itemSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  slot: z.nativeEnum(EquipSlot),
  weaponType: z.nativeEnum(WeaponType),
  levelReq: z.coerce.number().int().min(1),
  rarity: z.nativeEnum(ItemRarity),
  description: z.string().default(""),
  stats: z.string().default(""),
  iconUrl: z.string().optional(),
});

function parseItemForm(formData: FormData) {
  return itemSchema.parse({
    name: formData.get("name"),
    slot: formData.get("slot"),
    weaponType: formData.get("weaponType"),
    levelReq: formData.get("levelReq"),
    rarity: formData.get("rarity"),
    description: formData.get("description") ?? "",
    stats: formData.get("stats") ?? "",
    iconUrl: formData.get("iconUrl") || undefined,
  });
}

function revalidateItemPaths(slug?: string) {
  revalidatePath("/items");
  revalidatePath("/admin/items");
  revalidatePath("/");
  if (slug) revalidatePath(`/items/${slug}`);
}

export async function createItem(formData: FormData) {
  const data = parseItemForm(formData);
  const slug = slugify(data.name);

  await prisma.item.create({
    data: { ...data, slug, isPlaceholder: false },
  });

  revalidateItemPaths(slug);
  redirect("/admin/items");
}

export async function updateItem(id: string, formData: FormData) {
  const data = parseItemForm(formData);
  const existing = await prisma.item.findUniqueOrThrow({ where: { id } });

  // Si cambia el nombre, regeneramos el slug (y por lo tanto la URL pública).
  const slug = data.name === existing.name ? existing.slug : slugify(data.name);

  await prisma.item.update({
    where: { id },
    data: { ...data, slug },
  });

  revalidateItemPaths(existing.slug);
  revalidateItemPaths(slug);
  redirect("/admin/items");
}

export async function deleteItem(id: string) {
  const existing = await prisma.item.delete({ where: { id } });
  revalidateItemPaths(existing.slug);
  redirect("/admin/items");
}
