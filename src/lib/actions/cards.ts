"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CardRarity, CardSlot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const cardSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  slot: z.nativeEnum(CardSlot),
  rarity: z.nativeEnum(CardRarity),
  classRestriction: z.string().default(""),
  description: z.string().default(""),
  ability: z.string().default(""),
  stats: z.string().default(""),
  collectionBonus: z.string().default(""),
  awaken: z.string().default(""),
  refine: z.string().default(""),
  iconUrl: z.string().optional(),
});

function parseCardForm(formData: FormData) {
  return cardSchema.parse({
    name: formData.get("name"),
    slot: formData.get("slot"),
    rarity: formData.get("rarity"),
    classRestriction: formData.get("classRestriction") ?? "",
    description: formData.get("description") ?? "",
    ability: formData.get("ability") ?? "",
    stats: formData.get("stats") ?? "",
    collectionBonus: formData.get("collectionBonus") ?? "",
    awaken: formData.get("awaken") ?? "",
    refine: formData.get("refine") ?? "",
    iconUrl: formData.get("iconUrl") || undefined,
  });
}

function revalidateCardPaths(slug?: string) {
  revalidatePath("/panel/cards");
  revalidatePath("/admin/cards");
  if (slug) revalidatePath(`/panel/cards/${slug}`);
}

export async function createCard(formData: FormData) {
  const data = parseCardForm(formData);
  const slug = slugify(data.name);

  await prisma.card.create({
    data: { ...data, slug, isPlaceholder: false },
  });

  revalidateCardPaths(slug);
  redirect("/admin/cards");
}

export async function updateCard(id: string, formData: FormData) {
  const data = parseCardForm(formData);
  const existing = await prisma.card.findUniqueOrThrow({ where: { id } });

  // Si cambia el nombre, regeneramos el slug (y por lo tanto la URL pública).
  const slug = data.name === existing.name ? existing.slug : slugify(data.name);

  await prisma.card.update({
    where: { id },
    data: { ...data, slug },
  });

  revalidateCardPaths(existing.slug);
  revalidateCardPaths(slug);
  redirect("/admin/cards");
}

export async function deleteCard(id: string) {
  const existing = await prisma.card.delete({ where: { id } });
  revalidateCardPaths(existing.slug);
  redirect("/admin/cards");
}
