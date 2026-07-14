"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const setSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  baseStatText: z.string().default(""),
});

function parseSetForm(formData: FormData) {
  return setSchema.parse({
    name: formData.get("name"),
    baseStatText: formData.get("baseStatText") ?? "",
  });
}

function parseTiers(formData: FormData) {
  const levels = formData.getAll("tierRefineLevel").map(String);
  const texts = formData.getAll("tierStatText").map(String);
  const tiers: { refineLevel: number; statText: string }[] = [];

  levels.forEach((level, i) => {
    const refineLevel = Number(level);
    const statText = (texts[i] ?? "").trim();
    if (level.trim() && statText && Number.isInteger(refineLevel)) {
      tiers.push({ refineLevel, statText });
    }
  });

  return tiers;
}

function parsePieceBonuses(formData: FormData) {
  const counts = formData.getAll("pieceCount").map(String);
  const texts = formData.getAll("pieceStatText").map(String);
  const bonuses: { pieceCount: number; statText: string }[] = [];

  counts.forEach((count, i) => {
    const pieceCount = Number(count);
    const statText = (texts[i] ?? "").trim();
    if (count.trim() && statText && Number.isInteger(pieceCount)) {
      bonuses.push({ pieceCount, statText });
    }
  });

  return bonuses;
}

function revalidateSetPaths() {
  revalidatePath("/admin/sets");
  revalidatePath("/admin/items");
  revalidatePath("/panel/items");
}

export async function createItemSet(formData: FormData) {
  const data = parseSetForm(formData);
  const tiers = parseTiers(formData);
  const pieceBonuses = parsePieceBonuses(formData);
  const slug = slugify(data.name);

  await prisma.itemSet.create({
    data: {
      ...data,
      slug,
      tiers: { create: tiers },
      pieceBonuses: { create: pieceBonuses },
    },
  });

  revalidateSetPaths();
  redirect("/admin/sets");
}

export async function updateItemSet(id: string, formData: FormData) {
  const data = parseSetForm(formData);
  const tiers = parseTiers(formData);
  const pieceBonuses = parsePieceBonuses(formData);
  const existing = await prisma.itemSet.findUniqueOrThrow({ where: { id } });
  const slug = data.name === existing.name ? existing.slug : slugify(data.name);

  await prisma.$transaction([
    prisma.itemSetTier.deleteMany({ where: { setId: id } }),
    prisma.itemSetPieceBonus.deleteMany({ where: { setId: id } }),
    prisma.itemSet.update({
      where: { id },
      data: {
        ...data,
        slug,
        tiers: { create: tiers },
        pieceBonuses: { create: pieceBonuses },
      },
    }),
  ]);

  revalidateSetPaths();
  redirect("/admin/sets");
}

export async function deleteItemSet(id: string) {
  await prisma.itemSet.delete({ where: { id } });
  revalidateSetPaths();
  redirect("/admin/sets");
}
