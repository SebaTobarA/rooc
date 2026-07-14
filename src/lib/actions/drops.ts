"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const dropSchema = z.object({
  monsterId: z.string().min(1, "Elegí un monstruo"),
  itemId: z.string().min(1, "Elegí un ítem"),
  rate: z.coerce.number().min(0).max(100),
});

function parseDropForm(formData: FormData) {
  return dropSchema.parse({
    monsterId: formData.get("monsterId"),
    itemId: formData.get("itemId"),
    rate: formData.get("rate"),
  });
}

async function revalidateDropPaths(monsterId: string, itemId: string) {
  const [monster, item] = await Promise.all([
    prisma.monster.findUnique({ where: { id: monsterId } }),
    prisma.item.findUnique({ where: { id: itemId } }),
  ]);
  revalidatePath("/admin/drops");
  if (monster) revalidatePath(`/panel/monsters/${monster.slug}`);
  if (item) revalidatePath(`/panel/items/${item.slug}`);
}

export async function createDrop(formData: FormData) {
  const data = parseDropForm(formData);

  await prisma.drop.upsert({
    where: { monsterId_itemId: { monsterId: data.monsterId, itemId: data.itemId } },
    update: { rate: data.rate },
    create: data,
  });

  await revalidateDropPaths(data.monsterId, data.itemId);
  redirect("/admin/drops");
}

export async function updateDrop(id: string, formData: FormData) {
  const data = parseDropForm(formData);

  await prisma.drop.update({ where: { id }, data });

  await revalidateDropPaths(data.monsterId, data.itemId);
  redirect("/admin/drops");
}

export async function deleteDrop(id: string) {
  const existing = await prisma.drop.delete({ where: { id } });
  await revalidateDropPaths(existing.monsterId, existing.itemId);
  redirect("/admin/drops");
}
